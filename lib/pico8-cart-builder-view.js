'use babel';

export default class Pico8CartBuilderView {

  constructor(serializedState) {

    this.progressBar = {
      progress:0,
      color: 'orange',
      element: document.createElement('div'),
      width: 200,
      height: 10,
      setProgress: function(amt) {
        this.progress = amt;
        this.element.style.boxShadow = (this.progress * this.width) + 'px 0 0 0 ' + this.color + ' inset';
      },
      setSize: function(w,h) {
        this.width = w;
        this.height = h;
        this.element.style.width = w + 'px';
        this.element.style.height = h + 'px';
        this.setProgress(this.progress);
      },
      init: function() {
        this.setSize(this.width, this.height);
        this.setProgress(this.progress);
        this.element.style.border='solid 1px ' + this.color;
        this.element.style.display='inline-block';
      }
    };

    this.progressBar.element.classList.add('progressbar');
    this.progressBar.init();

    this.progressPanel = document.createElement('div');
    this.progressPanel.classList.add('pico8-cart-builder');
    this.progressPanel.classList.add('p8cb-panel');

    this.progressMessage = document.createTextNode('');

    this.progressPanel.appendChild(this.progressMessage);
    this.progressPanel.appendChild(this.progressBar.element);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.progressPanel.remove();
  }

  getStatusPanelElement() {
    return this.progressPanel;
  }

  setMessage(message) {
    this.progressMessage.textContent = message + ' ';
  }

  setProgress(amt) {
    this.progressBar.setProgress(amt);
  }
}
