// note: make all syntax use semicolon sometime...

// dependencies
const vscode = require('vscode');
const fetch = require('.\\node_modules\\node-fetch');

// constants
const constants = {
	"obfuscate-url": 'https://ibidk.herokuapp.com/obfuscate-key',
	"changelog-url": 'https://ibidk.herokuapp.com/changelog.txt'
};

// obfuscate button element
let obfuscate = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
obfuscate.command = "clvbrew.obfuscate";
obfuscate.tooltip = "obfuscate script";
obfuscate.text = "$(output) obfuscate";

// changelog button element
let changelog_ = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
changelog_.command = "clvbrew.changelog";
changelog_.tooltip = "changelog of clvbrew";
changelog_.text = "$(book) changelog";

function activate(context) {
	changelog_.show()
	obfuscate.show()

	let disposable = vscode.commands.registerCommand('clvbrew.obfuscate', function () {
		const settings = vscode.workspace.getConfiguration('clvbrew-obf')
		if (!settings || settings['api key'] == "" || !vscode.window.activeTextEditor) {
			vscode.window.showErrorMessage("api key is necessary for usage of extension")
			return
		}

		var text_editor = vscode.window.activeTextEditor

		// notification
		vscode.window.showInformationMessage("obfuscation starting, this might take a while")

		// send obfuscation request
		fetch(constants["obfuscate-url"], {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				key: settings['api key'],
				script: text_editor.document.getText(),
				encAllStrings: settings['encrypt all strings'],
				encImportantStrings: settings['encrypt important strings'],
				noControlFlow: settings['no control flow'],
				debugInfo: settings['debug info'],
				noCompressBS: settings['no compression bullshit']
			  })
		})
		.then(res => {
			if(res.status === 401)
				throw new Error()

			return res.text()
		})
		.then(text => {
			// check for errors
			if (text.includes("Obfuscation error")) {
				vscode.window.showErrorMessage('syntax issue in script found, validate your code')
				return
			} else if (text.includes("DOCTYPE")) {
				vscode.window.showErrorMessage('heroku error occured during obfuscation, re-run process')
				return
			}

			// determine output type & act on it
			if (settings['output type'] == 'create new file') {
				vscode.workspace.openTextDocument({"content": `${text}`, "language": "lua"})
				vscode.window.showInformationMessage("obfuscated, opening new tab")
			} else if (settings['output type'] == 'replace current file') {
				// get range object for current editor
				var editor_full_range = new vscode.Range(
					text_editor.document.positionAt(0),
					text_editor.document.positionAt( text_editor.document.getText().length )
				)
				
				// replace current editor text with new text, requires range object
				text_editor.edit(editBuilder => {editBuilder.replace(editor_full_range, text)})
				vscode.window.showInformationMessage("obfuscated, and replaced current file")
			} else if (settings['output type'] == 'copy to clipboard') {
				vscode.env.clipboard.writeText(text);
				vscode.window.showInformationMessage("obfuscated, copied to clipboard")
			}
		})
		.catch(function(reason) {
			vscode.window.showErrorMessage('invalid api key detected, use !api or !resetapi to get your key')
		})

	});

	let changelog = vscode.commands.registerCommand('clvbrew.changelog', function() {
		fetch(constants["changelog-url"], {
			method: "GET"
		})
		.then(res => res.text())
		.then(body => {
		    const versions = body.replace(/-/g,"# ").match(/(?:\# ([a-f\.0-9]+?))\[\n*((.*\n)+?)\]/g).reverse()
			
			let out = ""
		    for (let i in versions)
				out += versions[i].replace(/(\[\n)/g, "\n").replace(/(\n\])/g, "\n\n")
			
			vscode.workspace.openTextDocument({ "content": `${out}`, "language": "markdown" })
			vscode.window.showInformationMessage("changelog opened")
		})
	})

	context.subscriptions.push(disposable); context.subscriptions.push(changelog);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
	obfuscate.dispose()
	changelog_.dispose()
}

module.exports = {
	activate,
	deactivate
}