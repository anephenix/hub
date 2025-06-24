import os from "node:os";
import HubClient from "../../../dist/esm/lib/client/HubClient.node.js";

const hubClient = new HubClient({ url: "ws://localhost:6000" });

const reportMemory = ({ reply }) => {
	const freemem = os.freemem();
	const totalmem = os.totalmem();
	reply({ data: { freemem, totalmem } });
};

hubClient.rpc.add("report-memory", reportMemory);
