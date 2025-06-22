// Dependencies
const gitChangedFiles = require("git-changed-files");
const simpleGit = require("simple-git");
const fs = require("fs");
const util = require("util");
const path = require("path");
const git = simpleGit({
	baseDir: process.cwd(),
	binary: "git",
});
const exec = util.promisify(require("child_process").exec);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const { useRedisServer } = require("../helpers/redisServer");

// Example usage:

// Remember the principle of programmatic modules that can be run independently of being part of a cli

const formatDate = (date) => {
	const options = {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	};
	const formattedDate = date.toLocaleDateString("en-US", options);
	const daySuffix = getDaySuffix(date.getDate());
	return formattedDate.replace(/\d+(st|nd|rd|th)/, daySuffix);
};

const getDaySuffix = (day) => {
	if (day >= 11 && day <= 13) {
		return "th";
	}
	switch (day % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
};

const amendChangelogFile = async () => {
	const filePath = path.join(process.cwd(), "CHANGELOG.md");
	const content = await readFile(filePath, "utf-8");
	const lines = content.split("\n");
	const title = lines[0];
	const update = `### ${formatDate(new Date())}\n\n - Updated dependencies`;
	const newContent = `${title}\n\n${update}\n\n${lines.slice(2).join("\n")}`;
	await writeFile(filePath, newContent, "utf-8");
};

const runTests = async () => {
	return await exec("npm t");
};

const makeUpdates = async () => {
	return await exec("npx ncu -u");
};

const installUpdates = async () => {
	return await exec("npm i");
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
	return await exec("npm version patch");
};

const commitToGit = async () => {
	return await exec('git commit -m "Applied npm updates"');
};

const createGitTag = async () => {
	const version = require("../package.json").version;
	return await exec(`git tag -a v${version} -m "Applied npm updates"`);
};

// NOTE - we will need a way to intercept requests to sign the push from the command line
const pushToGit = async (originAndBranch) => {
	return await exec(`git push ${originAndBranch}`);
};

// NOTE - we will need a way to intercept requests to pass the OTP from the command line
const publishToNpm = async () => {
	return await exec("npm publish --access=public");
};

const main = async () => {
	try {
		await useRedisServer(async () => {
			await runTests();
			await makeUpdates();
			const hasChanges = await checkForChanges();
			if (hasChanges) {
				await installUpdates();
				await runTests();
				await amendChangelogFile();
				await addChangesToGit();
				await commitToGit();
				await bumpVersion();
				await createGitTag();
				// These may need shell input
				await pushToGit("origin master");
				// These may need shell input
				await pushToGit("origin --tags");
				await publishToNpm();
			} else {
				console.log("No changes to commit");
			}
		});
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
