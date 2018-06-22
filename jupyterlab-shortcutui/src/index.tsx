import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  JSONValue
} from '@phosphor/coreutils';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ReactElementWidget
} from '@jupyterlab/apputils';

import * as React from 'react';

import '../style/index.css';

interface ShortcutListProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
}

 interface ShortcutListItemProps {
   key: string;
   command: string;
   settingRegistry: ISettingRegistry;
   shortcutPlugin: string;
 }

 interface ShortcutListItemState {
   value: string;
   keyBinding: JSONValue;
   keyBindingFetched: boolean;
 }

class ShortcutListItem extends React.Component<ShortcutListItemProps, ShortcutListItemState> {
  constructor(props) {
    super(props);
    this.state = {
      value: "",
      keyBindingFetched: false,
      keyBinding: undefined
    };
  }

  componentDidMount() {
    this.getCommandKeybinding(this.state.keyBinding);
  }

  handleUpdate = () => {
    let removeKeybindingPromise = this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command);
    let setKeybindingPromise = this.props.settingRegistry.set(this.props.shortcutPlugin, this.props.command, {command: this.props.command, keys: [this.state.value], selector: this.props.command['selector']});
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this.setState({value:""});
    this.getCommandKeybinding(this.state.keyBinding);
  }

  handleInput = (event) => {
    if (event.key=="Backspace"){
      this.setState({value: this.state.value.substr(0, this.state.value.lastIndexOf(' ')+1)});
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

  updateInputValue = (event) => {
    this.setState({
      value: event.target.value
    });
  }

  getCommandKeybinding = (keyBinding: JSONValue) => {
    this.props.settingRegistry.get(this.props.shortcutPlugin, this.props.command).then(result => {
      if(result != undefined) {
        this.setState({keyBinding :result.composite});
      }
    }).then(result => this.setState({keyBindingFetched: true}));
  }

  render() {
    if(!this.state.keyBindingFetched) { 
      return null
    };
    return (
      <div className="jp-cmditem">
        <div className="jp-cmdlabel">{this.props.command} {(this.state.keyBinding === undefined ? '' : this.state.keyBinding['keys'])}</div>
        <input className="jp-input" value={this.state.value} onChange={this.updateInputValue} onKeyDown={this.handleInput}></input>
        <button className="jp-button" onClick={this.handleUpdate}>Submit</button>
      </div>
    );
  }
}

class ShortcutList extends React.Component<ShortcutListProps, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    let commandItems: Array<JSX.Element> = new Array<JSX.Element>();
    this.props.commandList.forEach(command => 
      commandItems.push(<ShortcutListItem shortcutPlugin = {this.props.shortcutPlugin} key={command} command={command} settingRegistry={this.props.settingRegistry}/>)
      );
    return (
      <div className="jp-shortcutlist">
         {commandItems}
      </div>
    );
  }
}

const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, settingRegistry: ISettingRegistry, palette: ICommandPalette): void => {
    let shortcutList = React.createElement(ShortcutList, {commandList: app.commands.listCommands(), settingRegistry: settingRegistry, shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin'});
    let widget: ReactElementWidget = new ReactElementWidget(shortcutList);
    widget.id = 'jupyterlab-shortcutui';
    widget.title.label = 'Shortcut UI';
    widget.title.closable = true;
    widget.addClass('jp-shortcutWidget');

    // Add an application command
    const command: string = 'shortcutui:open';
    app.commands.addCommand(command, {
      label: 'Shortcut UI',
      execute: () => {
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.addToMainArea(widget);
        }
        // Activate the widget
        app.shell.activateById(widget.id);
      }
    }); 

    palette.addItem({command, category: 'AAA'});
    },
    autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;