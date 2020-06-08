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

		const fullRange = new vscode.Range(
			vscode.window.activeTextEditor.document.positionAt(0),
			vscode.window.activeTextEditor.document.positionAt(
				vscode.window.activeTextEditor.document.getText().length
			)
		)

		fetch(constants["obfuscate-url"], {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				key: settings['api key'],
				script: vscode.window.activeTextEditor.document.getText(),
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
			if (settings['output type'] == 'create new file') {
				vscode.workspace.openTextDocument({"content": `${text}`, "language": "lua"})
				vscode.window.showInformationMessage("obfuscated, opening new tab")
			} else if (settings['output type'] == 'replace current file') {
				vscode.window.activeTextEditor.edit(editBuilder => {editBuilder.replace(fullRange, text)})
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