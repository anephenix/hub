const HubClient = require("../../../lib/client");
const hubClient = new HubClient({ url: "ws://localhost:6000" });
const os = require("os");

const reportMemory = ({ reply }) => {
	const freemem = os.freemem();
	const totalmem = os.totalmem();
	reply({ data: { freemem, totalmem } });
};

hubClient.rpc.add("report-memory", reportMemory);
