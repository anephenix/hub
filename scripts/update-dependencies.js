// Dependencies
const ncu = require('npm-check-updates');
const gitChangedFiles = require('git-changed-files');
const simpleGit = require('simple-git');
const fs = require('fs');
const util = require('util');
const path = require('path');
const git = simpleGit({
	baseDir: process.cwd(),
	binary: 'git',
});
const npm = require('npm');

const readFile = util.promisify(fs.readFile);

// Remember the principle of programmatic modules that can be run independently of being part of a cli

const amendChangelogFile = async () => {
	const filePath = path.join(process.cwd(), 'CHANGELOG.md');
	const content = await readFile(filePath, 'utf-8');
	console.log({
		content,
		lines: content.split('/n').length,
	});
	// find the changelog file
	// open it,
	// read the contents
	// inject a line with the date, a changelog message, and then some spacing
	// then save the file at the same file path
};

const main = async () => {
	// Runs tests, find updates and installs them, then runs tests again
	await ncu.run({ doctor: true, upgrade: true });
	const { unCommittedFiles } = await gitChangedFiles();
	if (unCommittedFiles.length > 0) {
		// add the changed files to git
		await git.add(unCommittedFiles);

		// Add an entry to the CHANGELOG.md file
		// (QUESTION - will npm version patch pull in changed git files?)
		await amendChangelogFile();

		//
		npm.load(() => npm.commands.version(['patch']));

		// Run npm version patch
		// Run git push origin master && git push origin --tags
		// Run npm publish --access=public
	}
};

(async () => await main())();
