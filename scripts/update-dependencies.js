// Dependencies
const gitChangedFiles = require('git-changed-files');
const simpleGit = require('simple-git');
const fs = require('fs');
const util = require('util');
const path = require('path');
const git = simpleGit({
	baseDir: process.cwd(),
	binary: 'git',
});
const exec = util.promisify(require('child_process').exec);

const readFile = util.promisify(fs.readFile);

// Remember the principle of programmatic modules that can be run independently of being part of a cli

const amendChangelogFile = async () => {
	// find the changelog file
	const filePath = path.join(process.cwd(), 'CHANGELOG.md');
	// open it,
	const content = await readFile(filePath, 'utf-8');
	// read the contents
	console.log({
		content,
		lines: content.split('/n').length,
	});
	// inject a line with the date, a changelog message, and then some spacing
	const update = `# ${new Date().toISOString()} - Updated dependencies`;
	const newContent = `${update}` + content;
	console.log({ newContent });
	// then save the file at the same file path
};

const runTests = async () => {
	return await exec('npm t');
};

const makeUpdates = async () => {
	return await exec('npx ncu -u');
};

const installUpdates = async () => {
	return await exec('npm i');
};

const checkForChanges = async () => {
	const { unCommittedFiles } = await gitChangedFiles();
	return unCommittedFiles.length > 0;
};

const addChangesToGit = async () => {
	const { unCommittedFiles } = await gitChangedFiles();
	await git.add(unCommittedFiles);
};

const bumpVersion = async () => {
	return await exec('npm version patch');
};

const commitToGit = async () => {
	return await exec('git commit -m "Applied npm updates"');
};

const createGitTag = async () => {
	const version = require('../package.json').version;
	return await exec(`git tag -a v${version} -m "Applied npm updates"`);
};

// NOTE - we will need a way to intercept requests to sign the push from the command line
const pushToGit = async (originAndBranch) => {
	return await exec(`git push ${originAndBranch}`);
};

// NOTE - we will need a way to intercept requests to pass the OTP from the command line
const publishToNpm = async () => {
	return await exec('npm publish --access=public');
};

const main = async () => {
	try {
		await runTests();
		await makeUpdates();
		const hasChanges = await checkForChanges();
		if (hasChanges) {
			await bumpVersion();
			await installUpdates();
			await runTests();
			await amendChangelogFile();
			await addChangesToGit();
			await commitToGit();
			await createGitTag();
			// These may need shell input
			await pushToGit('origin master');
			// These may need shell input
			await pushToGit('origin --tags');
			await publishToNpm();
		} else {
			console.log('No changes to commit');
		}
	} catch (err) {
		console.log(err);
	}
	// Runs tests, find updates and installs them, then runs tests again

	// await ncu.run({ doctor: true, upgrade: true });
	// const { unCommittedFiles } = await gitChangedFiles();
	// if (unCommittedFiles.length > 0) {
	// 	// add the changed files to git
	// 	await git.add(unCommittedFiles);

	// 	// Add an entry to the CHANGELOG.md file
	// 	// (QUESTION - will npm version patch pull in changed git files?)
	// 	await amendChangelogFile();

	// 	await exec('npm version patch');
	// 	// Run npm version patch
	// 	// Run git push origin master && git push origin --tags
	// 	// Run npm publish --access=public
	// } else {
	// 	console.log('No changes to commit');
	// }
};

(async () => await main())();
