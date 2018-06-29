import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

// import {
//   JSONValue //, JSONObject
// } from '@phosphor/coreutils';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ReactElementWidget
} from '@jupyterlab/apputils';

import * as React from 'react';

import '../style/index.css';

//import { CommandPalette } from '@phosphor/widgets';


interface UserInterfaceProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  categories: Array<string>;
 }

 interface UserInterfaceState {
   shortcutList: Object[];
   shortcutsFetched: boolean;
 }

interface ShortcutListProps {
  shortcuts: Object[]
  handleUpdate: Function;
  resetShortcut: Function;
}

interface TopNavProps {
  resetShortcuts: Function;
}

interface ShortcutCategoryProps {
  category: string;
  shortcuts: Object[];
  handleUpdate: Function;
  resetShortcut: Function;
}

interface ShortcutItemProps {
  command: Object;
  category: string;
  handleUpdate: Function;
  resetShortcut: Function;
}

interface ShortcutItemState {
  value: string;
  displayInput: boolean;
}

/* React component for each command shortcut item */
class ShortcutItem extends React.Component<ShortcutItemProps, ShortcutItemState> {
  constructor(props) {
    super(props);
    this.state = {
      value: "",
      displayInput: false
    }
  }

  /* Parse and normalize user input */
  handleInput = (event: any) => {
    if (event.key == "Backspace"){
      this.setState({value: this.state.value.substr(0, this.state.value.lastIndexOf(' ') + 1)});
    }
    else if (event.key == "Control"){
      this.setState({value: this.state.value + " Ctrl"});
    }
    else if (event.key == "Meta"){
      this.setState({value: this.state.value + " Accel"});
    }
    else if (event.key == "Alt" || event.key == "Shift" || event.key == "Enter" || event.ctrlKey || event.metaKey) {
      this.setState({value: this.state.value + " " + event.key});
    }
    else {
      this.setState({value: this.state.value + " "});
    }
  }

  /* Update input box's displayed value */
  updateInputValue = (event: any) => {
    this.setState({
      value: event.target.value
    });
  }

  /* Toggle display state of input area */
  toggleInput = () => {
    this.setState(prevState => ({
      displayInput: !prevState.displayInput,
      value: ""
    }));
  }

  /* Generate command label from id */
  createLabel = (): string => {
    let commandLabel: string;
    let commandLabelArray: string[]
    commandLabel = this.props.command['composite']['command'].split(":")[1].replace(/-/g, " ");
    commandLabelArray = commandLabel.split(" ");
    commandLabelArray = commandLabelArray.map(function(item) {
      return item.charAt(0).toUpperCase() + item.substring(1);
    })
    commandLabel = commandLabelArray.toString().replace(/,/g, " ");
    return commandLabel;
  }

  render() {
    return (
      <div className="jp-cmditem">
        <div className="jp-label-container">
          <div className="jp-label">{this.createLabel()}</div>
        </div>
        <div className="jp-shortcut-container">
          <button className="jp-shortcut" onClick={() => this.props.handleUpdate(this.props.command, "")}>{this.props.command['composite']['keys']}</button>
          <span className="jp-input-plus" onClick={this.toggleInput}>+</span>
          {(this.state.displayInput ? (
            <div className="jp-input-container">
              <input className="jp-input" value={this.state.value} onChange={this.updateInputValue} onKeyDown={this.handleInput}></input>
              <button className="jp-submit" onClick={() => {this.props.handleUpdate(this.props.command, this.state.value); this.toggleInput();}}>Submit</button>
            </div>
          ) : (
            null
            )
          )}
        </div>
        <div className="jp-source-container">
          <div className="jp-source">{"Default"}</div>
          <a className="jp-reset" onClick={() =>this.props.resetShortcut(this.props.command['composite']['command'])}>reset</a>
        </div>
      </div>
    );
  }
}

/* React component for listing each command category */
class ShortcutCategory extends React.Component<ShortcutCategoryProps, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    console.log(this.props.shortcuts);
    return (
      <div className="jp-shortcut-category">
        <p>{this.props.category}</p>
        {this.props.shortcuts.map(obj => <ShortcutItem key={obj['composite']['command']} resetShortcut={this.props.resetShortcut} command={obj} category={this.props.category} handleUpdate={this.props.handleUpdate}/>)}
      </div>
    )
  }
}

/*React component for top navigation*/
class TopNav extends React.Component<TopNavProps,{}> {
  render() {return (
    <div className="jp-shortcuttopnav">
      <a className="jp-link" onClick={() => this.props.resetShortcuts()}>Reset All</a>
      <div className = "jp-searchcontainer">
        <input className="jp-search"></input>
      </div>
      <a className="jp-link">Advanced Editor</a>
    </div>
  )}
}

/* React component for list of all categories and shortcuts */
class ShortcutList extends React.Component<ShortcutListProps, {}> {
  render() {
    return (
      <div className="jp-shortcutlist">
        <div className="jp-shortcutlistheader">
          <div className="jp-col1">Command</div>
          <div className="jp-col2">Shortcut</div>
          <div className="jp-col3">Source</div>
        </div>
        <div className="jp-shortcutlistmain">
          <div className="jp-shortcutlistcontainer">
            {this.props.shortcuts.map((obj, index) => <ShortcutCategory handleUpdate={this.props.handleUpdate} resetShortcut={this.props.resetShortcut} key={obj['category']} category={obj['category']} shortcuts={obj['shortcuts']}/>)}
          </div>
        </div>
      </div>
    );
  }
}

class ShortcutUI extends React.Component<UserInterfaceProps, UserInterfaceState> {
  constructor(props) {
    super(props);
  }

  state = {
    shortcutList: undefined,
    shortcutsFetched: false
  }

  componentDidMount() {
    this.getInitialState();
  }

  getInitialState = () => {
    console.log('getting initial state');
    let shortcutList = this.props.commandList.map(command => { 
      return this.getCommandShortcut(command);
      }
    )

    Promise.all(shortcutList).then(shortcuts => {
      let commandShortcuts = this.props.categories.map(category => {
        return {category: category, shortcuts: shortcuts.filter(shortcut => shortcut.composite['command'].split(":")[0] === category)};
      })
      this.setState({shortcutList: commandShortcuts, shortcutsFetched: true})
    })
  }

  /* Reset all shortcuts to their defaults */
  resetShortcuts = () => {
    console.log('resetting shortcuts');
    this.props.settingRegistry.load(this.props.shortcutPlugin).then(settings => Object.keys(settings.user).forEach(key => {
      this.props.settingRegistry.remove(this.props.shortcutPlugin, key);
    })).then(() => this.getInitialState());
  }

  /* Set new shortcut for command, refresh state */
  handleUpdate = (commandObject: Object, value: string) => {
    console.log('updating',commandObject,'to',value);
    let removeKeybindingPromise = this.props.settingRegistry.remove(this.props.shortcutPlugin, commandObject['composite']['command']);
    let setKeybindingPromise = this.props.settingRegistry.set(this.props.shortcutPlugin, commandObject['composite']['command'], {command: commandObject['composite']['command'], keys: [value], selector: commandObject['composite']['selector']});
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this.getInitialState();
  }


  /* Fetch shortcut from SettingRegistry */
  getCommandShortcut = (commandName: string) => {
    return this.props.settingRegistry.get(this.props.shortcutPlugin, commandName)}

  
  resetShortcut = (commandName: string) => {
    this.props.settingRegistry.remove(this.props.shortcutPlugin, commandName).then(() => this.getInitialState());
  }

  render() {
    if (!this.state.shortcutsFetched) {
      return null
    }
    return (
      <div className = "jp-shortcutui">
        <div className = 'jp-topwhitespace'></div>
        <TopNav resetShortcuts={this.resetShortcuts}/>
        <ShortcutList shortcuts={this.state.shortcutList} resetShortcut={this.resetShortcut} handleUpdate={this.handleUpdate}/>
      </div>
    )
  }
}

const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, settingRegistry: ISettingRegistry, palette: ICommandPalette): void => {

    let commandlist = new Array<string>();
    settingRegistry.load('@jupyterlab/shortcuts-extension:plugin').then(settings => Object.keys(settings.composite).forEach(key => {
      commandlist.push(key); })).then(settings => {
      let categories: Array<string> = new Array<string>();
      commandlist.forEach(command => { 
        if(categori
          es.indexOf(command.split(":")[0]) === -1) {
          categories.push(command.split(":")[0]);
        }
      });

    let shortcutUI = React.createElement(ShortcutUI, {commandList: commandlist, categories: categories, settingRegistry: settingRegistry, shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin'});
    let widget: ReactElementWidget = new ReactElementWidget(shortcutUI);
    widget.id = 'jupyterlab-shortcutui';
    widget.title.label = 'Keyboard Shortcut Settings';
    widget.title.closable = true;
    widget.addClass('jp-shortcutWidget');
    
    /* Add an application command */
    const command: string = 'shortcutui:open';
    app.commands.addCommand(command, {
      label: 'Keyboard Shortcut Settings',
      execute: () => {
        if (!widget.isAttached) {
          /* Attach the widget to the main work area if it's not there */
          app.shell.addToMainArea(widget);
        }
        /* Activate the widget */
        app.shell.activateById(widget.id);
      }
    }); 
    palette.addItem({command, category: 'Settings'});
    })
    
    },
    autoStart: true
};


/* Export the plugin as default */
export default plugin;