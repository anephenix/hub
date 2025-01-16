"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
// Paths
var packageJsonPath = (0, path_1.join)(__dirname, '../package.json');
var changelogPath = (0, path_1.join)(__dirname, '../CHANGELOG.md');
// Get current version from package.json
var packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf-8'));
var currentVersion = packageJson.version;
// Bump patch version
var _a = currentVersion.split('.').map(Number), major = _a[0], minor = _a[1], patch = _a[2];
var nextVersion = "".concat(major, ".").concat(minor, ".").concat(patch + 1);
// Get previous version from git tags
var previousVersion = (0, child_process_1.execSync)('git describe --tags --abbrev=0 HEAD^')
	.toString()
	.trim();
// Get commit messages between previous version and current version
var commitMessages = (0, child_process_1.execSync)("git log ".concat(previousVersion, "..HEAD --pretty=format:\"- %s\""))
	.toString()
	.trim();
// Get current date
function getOrdinalSuffix(day) {
	if (day > 3 && day < 21)
		return 'th'; // Covers 11th to 19th
	switch (day % 10) {
	case 1:
		return 'st';
	case 2:
		return 'nd';
	case 3:
		return 'rd';
	default:
		return 'th';
	}
}
function formatDateToString() {
	var days = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	];
	var months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];
	var today = new Date();
	var dayName = days[today.getDay()];
	var day = today.getDate();
	var monthName = months[today.getMonth()];
	var year = today.getFullYear();
	var ordinalSuffix = getOrdinalSuffix(day);
	return "".concat(dayName, " ").concat(day).concat(ordinalSuffix, " ").concat(monthName, ", ").concat(year);
}
var currentDate = formatDateToString();
// Read current CHANGELOG.md content
var changelogContent = (0, fs_1.readFileSync)(changelogPath, 'utf-8');
// Create new changelog entry
var newChangelogEntry = "### ".concat(nextVersion, " - ").concat(currentDate, "\n\n").concat(commitMessages, "\n");
// Insert new changelog entry at the top
// const updatedChangelogContent = newChangelogEntry + changelogContent;
var changelogLines = changelogContent.split('\n');
changelogLines.splice(2, 0, newChangelogEntry);
var updatedChangelogContent = changelogLines.join('\n');
// Save updated CHANGELOG.md
(0, fs_1.writeFileSync)(changelogPath, updatedChangelogContent, 'utf-8');
console.log('CHANGELOG.md updated successfully.');
