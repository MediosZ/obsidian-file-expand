import {
  type App, type Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, type MenuItem,
  type TFile
} from 'obsidian'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { type Root, type PhrasingContent } from 'mdast'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  mySetting: string
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}
interface Document {
  title: string
  root: Root
}

function getTitleOfDocument (nodes: PhrasingContent[]): string {
  return toMarkdown({
    type: 'root',
    children: [
      {
        type: 'heading',
        depth: 1,
        children: nodes
      }
    ]
  })
    .slice(2)
    .trim()
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings

  async onload (): Promise<void> {
    await this.loadSettings()

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      // eslint-disable-next-line no-new
      new Notice('This is a notice!')
    })
    // Perform additional things with the ribbon
    ribbonIconEl.addClass('my-plugin-ribbon-class')

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem()
    statusBarItemEl.setText('Sample')

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-sample-modal-simple',
      name: 'Open sample modal (simple)',
      callback: () => {
        new SampleModal(this.app).open()
      }
    })
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: 'sample-editor-command',
      name: 'Sample editor command',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        console.log(editor.getSelection())
        editor.replaceSelection('Sample Editor Command')
      }
    })
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: 'open-sample-modal-complex',
      name: 'Open sample modal (complex)',
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (markdownView != null) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new SampleModal(this.app).open()
          }

          // This command will only show up in Command Palette when the check function returns true
          return true
        }
      }
    })
    // this.registerEvent(
    // this.app.workspace.on("editor-menu", (menu) => {
    //     menu.addSeparator();
    //     menu.addItem(item => {
    //         item
    //             .setTitle("TEsT Command")
    //             .setIcon("blocks")
    //             .onClick(() => {
    //                 const activeEditor = this.app.workspace.activeEditor;
    //                 let selectedText = "";
    //                 if (activeEditor !== null) {
    //                     selectedText = activeEditor.getSelection();
    //                 }
    //                 else {
    //                     selectedText = "NULL";
    //                 }
    //                 new Notice(`Select \n${selectedText}`);
    //             });
    //     });
    // }));
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file: TFile) => {
        const addIconMenuItem = (item: MenuItem): void => {
          item.setTitle('Expand to Folder')
          item.setIcon('hashtag')
          item.onClick(async () => {
            // console.log(file);
            const filename = file.basename
            // eslint-disable-next-line no-new
            new Notice(`Processing ${filename}`)
            const fileContent = await this.app.vault.cachedRead(file)
            const tree = fromMarkdown(fileContent)

            const documents: Document[] = []

            for (const obj of tree.children) {
              if (obj.type === 'heading' && obj.depth === 1) {
                const doc: Document = {
                  title: getTitleOfDocument(obj.children),
                  root: {
                    type: 'root',
                    children: []
                  }
                }
                documents.push(doc)
              } else {
                if (obj.type === 'heading') {
                  obj.depth -= 1
                }
                documents.at(-1)?.root.children.push(obj)
              }
            }

            await this.app.vault.createFolder(filename)
            for (const doc of documents) {
              await this.app.vault.create(`${filename}/${doc.title}.md`, toMarkdown(doc.root))
            }

            // create folder for this.
            // eslint-disable-next-line no-new
            new Notice(`Expand to Folder ${filename}!`)
          })
        }
        menu.addItem(addIconMenuItem)
      }
      ))

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this))

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
      console.log('click', evt)
    })

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => { console.log('setInterval') }, 5 * 60 * 1000))
  }

  async onunload (): Promise<void> {

  }

  async loadSettings (): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings (): Promise<void> {
    await this.saveData(this.settings)
  }
}

class SampleModal extends Modal {
  async onOpen (): Promise<void> {
    const { contentEl } = this
    contentEl.setText('Woah!')
  }

  async onClose (): Promise<void> {
    const { contentEl } = this
    contentEl.empty()
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin

  constructor (app: App, plugin: MyPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display (): void {
    const { containerEl } = this

    containerEl.empty()

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value
          await this.plugin.saveSettings()
        }))
  }
}