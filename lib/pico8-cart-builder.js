'use babel';

import Pico8CartBuilderView from './pico8-cart-builder-view';
import { CompositeDisposable } from 'atom';

export default {

  pico8CartBuilderView: null,
  modalPanel: null,
  subscriptions: null,
  statusPanel: null,
  activeBuildProcess: false,

  activate(state) {
    this.pico8CartBuilderView = new Pico8CartBuilderView(state.pico8CartBuilderViewState);

    this.statusPanel = atom.workspace.addBottomPanel({
      item: this.pico8CartBuilderView.getStatusPanelElement(),
      visible: false
    })

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'pico8-cart-builder:build': () => this.buildCarts()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'pico8-cart-builder:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.pico8CartBuilderView.destroy();
  },

  serialize() {
    return {
      pico8CartBuilderViewState: this.pico8CartBuilderView.serialize()
    };
  },

  buildCarts() {
    this.statusPanel.show();
    this.activeBuildProcess = true;
    this.pico8CartBuilderView.setProgress(0);

    this.buildAll();
  },

  async buildAll() {
    var directories = atom.project.getDirectories();

    var projects = [];
    for (var i = 0; i < directories.length; i++)
    {
      var dir = directories[i];
      var projectFile = dir.getFile('package.json');
      if (projectFile.existsSync())
      {
        var contents = await projectFile.read();
        var proj = JSON.parse(contents);

        if (proj.pico8 !== undefined)
        {
          proj.directory = dir;
          projects.push(proj);
        }
      }
    }

    for (var i = 0; i < projects.length; i++)
    {
      var project = projects[i];
      console.log(project);
      await this.buildProject(project, this.pico8CartBuilderView, 1/projects.length, i/projects.length);
      this.pico8CartBuilderView.setProgress((i+1)/projects.length);
    }
    this.pico8CartBuilderView.setMessage('Build Complete');
  },

  buildProject(project, view, progressChunk, progressOffset) {
    var self = this;
    return (async (resolve, reject) => {
      view.setMessage('Building: ' + project.projectName);

      var buildDir = project.directory.getSubdirectory('build');
      await buildDir.create();
      var cartFile = buildDir.getFile(project.cartName + '.p8');

      var cartData = [];
      cartData.push('pico-8 cartridge // http://www.pico-8.com');
      cartData.push('version 16');

      // CODE
      var codeDir = project.directory.getSubdirectory(project.codeDirectory);
      var allCode = await self.buildCode(codeDir, view, 0.8 * progressChunk, progressOffset);

      view.setProgress(progressOffset + 0.8 * progressChunk);

      cartData.push('__lua__');
      cartData.push('--' + project.labelTag1);
      cartData.push('--' + project.labelTag2);
      cartData.push(allCode);

      // DATA
      if (project.dataCart !== undefined && project.dataCart !== null && project.dataCart.length > 0)
      {
        var dataCart = project.directory.getFile(project.dataCart);
        var allData = await dataCart.read();

        view.setProgress(progressOffset + 0.9 * progressChunk);

        var dataArray = allData.split('\n');
        var found = false;
        for (var i = 0; i < dataArray.length; i++)
        {
          var data = dataArray[i];
          if (data.indexOf('__gfx__') >= 0)
          {
            found = true;
          }

          if (found)
          {
            cartData.push(data.replace('\r', ''));
          }
        }
      }

      await cartFile.write(cartData.join('\n'));
      view.setProgress(progressOffset + progressChunk);

      return ('Build Complete: ' + project.cartName);
    })();
  },

  buildCode(directory, view, progressChunk, progressOffset) {
    var self = this;
    return (async (resolve, reject) => {
      var entries = directory.getEntriesSync();
      var chunk = progressChunk / entries.length;

      var codeStr = [];
      for (var i = 0; i < entries.length; i++)
      {
        var e = entries[i];
        if (e.isFile()) {
          if (e.getPath().endsWith('.lua'))
          {
            var code = await e.read();
            codeStr.push(code);
          }
        }
        else {
          var code = await self.buildCode(e, view, chunk, progressOffset + (i*chunk));
          codeStr.push(code);
        }

        view.setProgress(progressOffset + i * chunk);
      }

      return codeStr.join('\n');
    })();
  },

  toggle() {
    this.statusPanel.visible ?
      this.statusPanel.hide() :
      this.statusPanel.show();
  }

};
