// TTN uses JavaScript ECMAScript 5.1
// Corrected and Modified version of original SenseCAP formater.
// Formater can be used for tracker: SenseCAP T1000-A/B and perhaps others.
// Note: I kept this file "formated". But when pasting it into TTN upload formater field
//       it will be to big. Solution: first replace all spaces with tapulators and then remove it.
//       in VSCode: press Ctrl+Shift+P, "Convert Indentation to Tabs", Find/Replace "\t" with "" (regex)
// Author: Stephan Enderlein (2024)
// License: MIT
function decodeUplink(input) {
	var bytes = input.bytes;
	var fport = parseInt(input.fPort);
	var bytesString = bytes2HexString(bytes);
	var originMessage = bytesString.toLocaleUpperCase();
	var measurement = messageAnalyzed(originMessage);
	var elements = [];
	var i;
	var message;
	var decoded = {
		valid: true,
		err: 0,
		payload: bytesString,
		messages: [],
	};

	if (fport === 199 || fport === 192) {
		decoded.messages.push({ "fport": fport, "payload": bytesString });
		return { data: decoded };
	}
	if (measurement.length === 0) {
		decoded.valid = false;
		return { data: decoded };
	}

	for (i = 0; i < measurement.length; i += 1) {
		message = measurement[i];
		if (message.length > 0 && message.errorCode) {
			decoded.err = message.errorCode;
			decoded.errMessage = message.error;
			return { data: decoded };
		}
		decoded.timestamp = message.timestamp;
		if (message.type == "Battery") { decoded.battery = message.measurementValue; }
		if (message.type == "Light") { decoded.light = message.measurementValue; }
		if (message.type == "Temperature") { decoded.temperature = message.measurementValue; }
		if (message.type == "Latitude") { decoded.latitude = message.measurementValue; }
		if (message.type == "Longitude") { decoded.longitude = message.measurementValue; }
		if (message.type == "Event Status") { decoded.eventStatus = message.measurementValue; }
		if (message.motionId !== undefined) { decoded.motionCount = message.motionId; }
	}

	decoded.messages = measurement;
	return { data: decoded };
}

function messageAnalyzed(messageValue) {
	var frames;
	var measurementResultArray = [];
	var i;
	var item;
	var dataId;
	var dataValue;
	var measurementArray = [];
	try {
		frames = unpack(messageValue);
		for (i = 0; i < frames.length; i += 1) {
			item = frames[i];
			dataId = item.dataId;
			dataValue = item.dataValue;
			measurementArray = deserialize(dataId, dataValue);
			// append content of measurementArray directly in result array (avoid nested arrays)
			measurementResultArray.push(...measurementArray);
		}
		return measurementResultArray;
	} catch (e) {
		return e.toString();
	}
}

function unpack(messageValue) {
	var frameArray = [];
	var remainMessage = messageValue;
	var dataId;
	var dataValue;
	var dataObj = {};
	var packageLen;

	while (remainMessage.length > 0) {
		dataId = remainMessage.substring(0, 2).toUpperCase();
		switch (dataId) {
			case "01":
				dataValue = remainMessage.substring(2, 94);
				remainMessage = remainMessage.substring(94);
				break;
			case "02":
				dataValue = remainMessage.substring(2, 32);
				remainMessage = remainMessage.substring(32);
				break;
			case "03":
				dataValue = remainMessage.substring(2, 64);
				remainMessage = remainMessage.substring(64);
				break;
			case "04":
				dataValue = remainMessage.substring(2, 20);
				remainMessage = remainMessage.substring(20);
				break;
			case "05":
				dataValue = remainMessage.substring(2, 10);
				remainMessage = remainMessage.substring(10);
				break;
			case "06":
				dataValue = remainMessage.substring(2, 44);
				remainMessage = remainMessage.substring(44);
				break;
			case "07":
				dataValue = remainMessage.substring(2, 84);
				remainMessage = remainMessage.substring(84);
				break;
			case "08":
				dataValue = remainMessage.substring(2, 70);
				remainMessage = remainMessage.substring(70);
				break;
			case "09":
				dataValue = remainMessage.substring(2, 36);
				remainMessage = remainMessage.substring(36);
				break;
			case "0A":
				dataValue = remainMessage.substring(2, 76);
				remainMessage = remainMessage.substring(76);
				break;
			case "0B":
				dataValue = remainMessage.substring(2, 62);
				remainMessage = remainMessage.substring(62);
				break;
			case "0C":
				break;
			case "0D":
				dataValue = remainMessage.substring(2, 10);
				remainMessage = remainMessage.substring(10);
				break;
			case "0E":
				packageLen = getInt(remainMessage.substring(8, 10)) * 2 + 10;
				dataValue = remainMessage.substring(2, 8) + remainMessage.substring(10, packageLen);
				remainMessage = remainMessage.substring(packageLen);
				break;
			case "0F":
				dataValue = remainMessage.substring(2, 34);
				remainMessage = remainMessage.substring(34);
				break;
			case "10":
				dataValue = remainMessage.substring(2, 26);
				remainMessage = remainMessage.substring(26);
				break;
			case "11":
				dataValue = remainMessage.substring(2, 28);
				remainMessage = remainMessage.substring(28);
				break;
			case "1A":
				dataValue = remainMessage.substring(2, 56);
				remainMessage = remainMessage.substring(56);
				break;
			case "1B":
				dataValue = remainMessage.substring(2, 96);
				remainMessage = remainMessage.substring(96);
				break;
			case "1C":
				dataValue = remainMessage.substring(2, 82);
				remainMessage = remainMessage.substring(82);
				break;
			case "1D":
				dataValue = remainMessage.substring(2, 40);
				remainMessage = remainMessage.substring(40);
				break;
			default:
				return frameArray;
		}

		if (dataValue && dataValue.length >= 2) {
			dataObj = {
				"dataId": dataId,
				"dataValue": dataValue
			};
			frameArray.push(dataObj);
		}
	}
	return frameArray;
}

function deserialize(dataId, dataValue) {
	var measurementArray = [];
	//var eventList = [];
	var measurement = {};
	var collectTime = 0;
	var groupId = 0;
	var shardFlag = {};
	var payload = "";
	var motionId = "";
	var interval;
	var workMode;
	var heartbeatInterval;
	var periodicInterval;
	var eventInterval;
	var errorCode;
	var error;

	switch (dataId) {
		case "01":
			measurementArray = getUpShortInfo(dataValue);
			Array.prototype.push.apply(measurementArray, getMotionSetting(dataValue.substring(30, 40)));
			Array.prototype.push.apply(measurementArray, getStaticSetting(dataValue.substring(40, 46)));
			Array.prototype.push.apply(measurementArray, getShockSetting(dataValue.substring(46, 52)));
			Array.prototype.push.apply(measurementArray, getTempSetting(dataValue.substring(52, 72)));
			Array.prototype.push.apply(measurementArray, getLightSetting(dataValue.substring(72, 92)));
			break;
		case "02":
			measurementArray = getUpShortInfo(dataValue);
			break;
		case "03":
			Array.prototype.push.apply(measurementArray, getMotionSetting(dataValue.substring(0, 10)));
			Array.prototype.push.apply(measurementArray, getStaticSetting(dataValue.substring(10, 16)));
			Array.prototype.push.apply(measurementArray, getShockSetting(dataValue.substring(16, 22)));
			Array.prototype.push.apply(measurementArray, getTempSetting(dataValue.substring(22, 42)));
			Array.prototype.push.apply(measurementArray, getLightSetting(dataValue.substring(42, 62)));
			break;
		case "04":
			interval = 0;
			workMode = getInt(dataValue.substring(0, 2));
			heartbeatInterval = getMinsByMin(dataValue.substring(4, 8));
			periodicInterval = getMinsByMin(dataValue.substring(8, 12));
			eventInterval = getMinsByMin(dataValue.substring(12, 16));
			switch (workMode) {
				case 0:
					interval = heartbeatInterval;
					break;
				case 1:
					interval = periodicInterval;
					break;
				case 2:
					interval = eventInterval;
					break;
			}
			measurementArray = [
				{ measurementId: "3940", type: "Work Mode", measurementValue: workMode },
				{ measurementId: "3942", type: "Heartbeat Interval", measurementValue: heartbeatInterval },
				{ measurementId: "3943", type: "Periodic Interval", measurementValue: periodicInterval },
				{ measurementId: "3944", type: "Event Interval", measurementValue: eventInterval },
				{ measurementId: "3941", type: "SOS Mode", measurementValue: getSOSMode(dataValue.substring(16, 18)) },
				{ measurementId: "3900", type: "Uplink Interval", measurementValue: interval }
			];
			break;
		case "05":
			measurementArray = [
				{ measurementId: "3000", type: "Battery", measurementValue: getBattery(dataValue.substring(0, 2)) },
				{ measurementId: "3940", type: "Work Mode", measurementValue: getWorkingMode(dataValue.substring(2, 4)) },
				{ measurementId: "3965", type: "Positioning Strategy", measurementValue: getPositioningStrategy(dataValue.substring(4, 6)) },
				{ measurementId: "3941", type: "SOS Mode", measurementValue: getSOSMode(dataValue.substring(6, 8)) }
			];
			break;
		case "06":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "4197", timestamp: collectTime, "motionId": motionId, type: "Longitude", measurementValue: parseFloat(getSensorValue(dataValue.substring(16, 24), 1000000)) },
				{ measurementId: "4198", timestamp: collectTime, "motionId": motionId, type: "Latitude", measurementValue: parseFloat(getSensorValue(dataValue.substring(24, 32), 1000000)) },
				{ measurementId: "4097", timestamp: collectTime, "motionId": motionId, type: "Temperature", measurementValue: getSensorValue(dataValue.substring(32, 36), 10) },
				{ measurementId: "4199", timestamp: collectTime, "motionId": motionId, type: "Light", measurementValue: getSensorValue(dataValue.substring(36, 40)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(40, 42)) }
			];
			break;
		case "07":
			//eventList = getEventStatus(dataValue.substring(0, 6));
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "5001", timestamp: collectTime, "motionId": motionId, type: "Wi-Fi Scan", measurementValue: getMacAndRssiObj(dataValue.substring(16, 72)) },
				{ measurementId: "4097", timestamp: collectTime, "motionId": motionId, type: "Temperature", measurementValue: getSensorValue(dataValue.substring(72, 76), 10) },
				{ measurementId: "4199", timestamp: collectTime, "motionId": motionId, type: "Light", measurementValue: getSensorValue(dataValue.substring(76, 80)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(80, 82)) }
			];
			break;
		case "08":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "5002", timestamp: collectTime, "motionId": motionId, type: "BLE Scan", measurementValue: getMacAndRssiObj(dataValue.substring(16, 58)) },
				{ measurementId: "4097", timestamp: collectTime, "motionId": motionId, type: "Temperature", measurementValue: getSensorValue(dataValue.substring(58, 62), 10) },
				{ measurementId: "4199", timestamp: collectTime, "motionId": motionId, type: "Light", measurementValue: getSensorValue(dataValue.substring(62, 66)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(66, 68)) }
			];
			break;
		case "09":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "4197", timestamp: collectTime, "motionId": motionId, type: "Longitude", measurementValue: parseFloat(getSensorValue(dataValue.substring(16, 24), 1000000)) },
				{ measurementId: "4198", timestamp: collectTime, "motionId": motionId, type: "Latitude", measurementValue: parseFloat(getSensorValue(dataValue.substring(24, 32), 1000000)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(32, 34)) }
			];
			break;
		case "0A":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "5001", timestamp: collectTime, "motionId": motionId, type: "Wi-Fi Scan", measurementValue: getMacAndRssiObj(dataValue.substring(16, 72)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(72, 74)) }
			];
			break;
		case "0B":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "5002", timestamp: collectTime, "motionId": motionId, type: "BLE Scan", measurementValue: getMacAndRssiObj(dataValue.substring(16, 58)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(58, 60)) }
			];
			break;
		case "0D":
			errorCode = getInt(dataValue);
			error = "";
			switch (errorCode) {
				case 1:
					error = "FAILED TO OBTAIN THE UTC TIMESTAMP";
					break;
				case 2:
					error = "ALMANAC TOO OLD";
					break;
				case 3:
					error = "DOPPLER ERROR";
					break;
			}
			measurementArray.push({ "errorCode": errorCode, "error": error });
			break;
		case "0E":
			shardFlag = getShardFlag(dataValue.substring(0, 2));
			groupId = getInt(dataValue.substring(2, 6));
			payload = dataValue.substring(6);
			measurement = {
				measurementId: "6152",
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "gnss-ng payload",
				measurementValue: payload
			};
			measurementArray.push(measurement);
			break;
		case "0F":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			shardFlag = getShardFlag(dataValue.substring(26, 28));
			groupId = getInt(dataValue.substring(28, 32));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray.push({
				measurementId: "4200",
				timestamp: collectTime,
				"motionId": motionId,
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "Event Status",
				measurementValue: getEventStatus(dataValue.substring(0, 6))
			});
			measurementArray.push({
				measurementId: "4097",
				timestamp: collectTime,
				"motionId": motionId,
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "Temperature",
				measurementValue: getSensorValue(dataValue.substring(16, 20), 10)
			});
			measurementArray.push({
				measurementId: "4199",
				timestamp: collectTime,
				"motionId": motionId,
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "Light",
				measurementValue: getSensorValue(dataValue.substring(20, 24))
			});
			measurementArray.push({
				measurementId: "3000",
				timestamp: collectTime,
				"motionId": motionId,
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "Battery",
				measurementValue: getBattery(dataValue.substring(24, 26))
			});
			break;
		case "10":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			shardFlag = getShardFlag(dataValue.substring(18, 20));
			groupId = getInt(dataValue.substring(20, 24));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray.push({
				measurementId: "4200",
				timestamp: collectTime,
				"motionId": motionId,
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "Event Status",
				measurementValue: getEventStatus(dataValue.substring(0, 6))
			});
			measurementArray.push({
				measurementId: "3000",
				timestamp: collectTime,
				"motionId": motionId,
				"groupId": groupId,
				index: shardFlag.index,
				count: shardFlag.count,
				type: "Battery",
				measurementValue: getBattery(dataValue.substring(16, 18))
			});
			break;
		case "11":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			measurementArray.push({
				measurementId: "3576",
				timestamp: collectTime,
				type: "Positioning Status",
				measurementValue: getPositingStatus(dataValue.substring(0, 2))
			});
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "4200",
				type: "Event Status",
				measurementValue: getEventStatus(dataValue.substring(2, 8))
			});
			if (!Number.isNaN(parseFloat(getSensorValue(dataValue.substring(16, 20), 10)))) {
				measurementArray.push({
					timestamp: collectTime,
					measurementId: "4097",
					type: "Temperature",
					measurementValue: getSensorValue(dataValue.substring(16, 20), 10)
				});
			}
			if (!Number.isNaN(parseFloat(getSensorValue(dataValue.substring(20, 24))))) {
				measurementArray.push({
					timestamp: collectTime,
					measurementId: "4199",
					type: "Light",
					measurementValue: getSensorValue(dataValue.substring(20, 24))
				});
			}
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "3000",
				type: "Battery",
				measurementValue: getBattery(dataValue.substring(36, 38))
			});
			break;
		case "1A":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "4197", timestamp: collectTime, "motionId": motionId, type: "Longitude", measurementValue: parseFloat(getSensorValue(dataValue.substring(16, 24), 1000000)) },
				{ measurementId: "4198", timestamp: collectTime, "motionId": motionId, type: "Latitude", measurementValue: parseFloat(getSensorValue(dataValue.substring(24, 32), 1000000)) },
				{ measurementId: "4097", timestamp: collectTime, "motionId": motionId, type: "Temperature", measurementValue: getSensorValue(dataValue.substring(32, 36), 10) },
				{ measurementId: "4199", timestamp: collectTime, "motionId": motionId, type: "Light", measurementValue: getSensorValue(dataValue.substring(36, 40)) },
				{ measurementId: "4210", timestamp: collectTime, "motionId": motionId, type: "AccelerometerX", measurementValue: getSensorValue(dataValue.substring(40, 44)) },
				{ measurementId: "4211", timestamp: collectTime, "motionId": motionId, type: "AccelerometerY", measurementValue: getSensorValue(dataValue.substring(44, 48)) },
				{ measurementId: "4212", timestamp: collectTime, "motionId": motionId, type: "AccelerometerZ", measurementValue: getSensorValue(dataValue.substring(48, 52)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(52, 54)) }
			];
			break;
		case "1B":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "5001", timestamp: collectTime, "motionId": motionId, type: "Wi-Fi Scan", measurementValue: getMacAndRssiObj(dataValue.substring(16, 72)) },
				{ measurementId: "4097", timestamp: collectTime, "motionId": motionId, type: "Temperature", measurementValue: getSensorValue(dataValue.substring(72, 76), 10) },
				{ measurementId: "4199", timestamp: collectTime, "motionId": motionId, type: "Light", measurementValue: getSensorValue(dataValue.substring(76, 80)) },
				{ measurementId: "4210", timestamp: collectTime, "motionId": motionId, type: "AccelerometerX", measurementValue: getSensorValue(dataValue.substring(80, 84)) },
				{ measurementId: "4211", timestamp: collectTime, "motionId": motionId, type: "AccelerometerY", measurementValue: getSensorValue(dataValue.substring(84, 88)) },
				{ measurementId: "4212", timestamp: collectTime, "motionId": motionId, type: "AccelerometerZ", measurementValue: getSensorValue(dataValue.substring(88, 92)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(92, 94)) }
			];
			break;
		case "1C":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			motionId = getMotionId(dataValue.substring(6, 8));
			measurementArray = [
				{ measurementId: "4200", timestamp: collectTime, "motionId": motionId, type: "Event Status", measurementValue: getEventStatus(dataValue.substring(0, 6)) },
				{ measurementId: "5002", timestamp: collectTime, "motionId": motionId, type: "BLE Scan", measurementValue: getMacAndRssiObj(dataValue.substring(16, 58)) },
				{ measurementId: "4097", timestamp: collectTime, "motionId": motionId, type: "Temperature", measurementValue: getSensorValue(dataValue.substring(58, 62), 10) },
				{ measurementId: "4199", timestamp: collectTime, "motionId": motionId, type: "Light", measurementValue: getSensorValue(dataValue.substring(62, 66)) },
				{ measurementId: "4210", timestamp: collectTime, "motionId": motionId, type: "AccelerometerX", measurementValue: getSensorValue(dataValue.substring(66, 70)) },
				{ measurementId: "4211", timestamp: collectTime, "motionId": motionId, type: "AccelerometerY", measurementValue: getSensorValue(dataValue.substring(70, 74)) },
				{ measurementId: "4212", timestamp: collectTime, "motionId": motionId, type: "AccelerometerZ", measurementValue: getSensorValue(dataValue.substring(74, 78)) },
				{ measurementId: "3000", timestamp: collectTime, "motionId": motionId, type: "Battery", measurementValue: getBattery(dataValue.substring(78, 80)) }
			];
			break;
		case "1D":
			collectTime = getUTCTimestamp(dataValue.substring(8, 16));
			measurementArray.push({
				measurementId: "3576",
				timestamp: collectTime,
				type: "Positioning Status",
				measurementValue: getPositingStatus(dataValue.substring(0, 2))
			});
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "4200",
				type: "Event Status",
				measurementValue: getEventStatus(dataValue.substring(2, 8))
			});
			if (!Number.isNaN(parseFloat(getSensorValue(dataValue.substring(16, 20), 10)))) {
				measurementArray.push({
					timestamp: collectTime,
					measurementId: "4097",
					type: "Temperature",
					measurementValue: getSensorValue(dataValue.substring(16, 20), 10)
				});
			}
			if (!Number.isNaN(parseFloat(getSensorValue(dataValue.substring(20, 24))))) {
				measurementArray.push({
					timestamp: collectTime,
					measurementId: "4199",
					type: "Light",
					measurementValue: getSensorValue(dataValue.substring(20, 24))
				});
			}
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "4210",
				type: "AccelerometerX",
				measurementValue: getSensorValue(dataValue.substring(24, 28))
			});
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "4211",
				type: "AccelerometerY",
				measurementValue: getSensorValue(dataValue.substring(28, 32))
			});
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "4212",
				type: "AccelerometerZ",
				measurementValue: getSensorValue(dataValue.substring(32, 36))
			});
			measurementArray.push({
				timestamp: collectTime,
				measurementId: "3000",
				type: "Battery",
				measurementValue: getBattery(dataValue.substring(36, 38))
			});
			break;
	}
	return measurementArray;
}


function getMotionId(str) {
	return getInt(str);
}

function getPositingStatus(str) {
	var status = getInt(str);
	switch (status) {
		case 0:
			return { id: status, statusName: "Positioning successful." };
		case 1:
			return { id: status, statusName: "The GNSS scan timed out and failed to obtain the location." };
		case 2:
			return { id: status, statusName: "The Wi-Fi scan timed out and failed to obtain the location." };
		case 3:
			return { id: status, statusName: "The Wi-Fi + GNSS scan timed out and failed to obtain the location." };
		case 4:
			return { id: status, statusName: "The GNSS + Wi-Fi scan timed out and failed to obtain the location." };
		case 5:
			return { id: status, statusName: "The Bluetooth scan timed out and failed to obtain the location." };
		case 6:
			return { id: status, statusName: "The Bluetooth + Wi-Fi scan timed out and failed to obtain the location." };
		case 7:
			return { id: status, statusName: "The Bluetooth + GNSS scan timed out and failed to obtain the location." };
		case 8:
			return { id: status, statusName: "The Bluetooth + Wi-Fi + GNSS scan timed out and failed to obtain the location." };
		case 9:
			return { id: status, statusName: "Location Server failed to parse the GNSS location." };
		case 10:
			return { id: status, statusName: "Location Server failed to parse the Wi-Fi location." };
		case 11:
			return { id: status, statusName: "Location Server failed to parse the Bluetooth location." };
		case 12:
			return { id: status, statusName: "Failed to parse the GNSS location due to the poor accuracy." };
		case 13:
			return { id: status, statusName: "Time synchronization failed." };
		case 14:
			return { id: status, statusName: "Failed to obtain location due to the old Almanac." };
	}
	return getInt(str);
}

function getUpShortInfo(messageValue) {
	return [
		{
			measurementId: "3000", type: "Battery", measurementValue: getBattery(messageValue.substring(0, 2))
		}, {
			measurementId: "3502", type: "Firmware Version", measurementValue: getSoftVersion(messageValue.substring(2, 6))
		}, {
			measurementId: "3001", type: "Hardware Version", measurementValue: getHardVersion(messageValue.substring(6, 10))
		}, {
			measurementId: "3940", type: "Work Mode", measurementValue: getWorkingMode(messageValue.substring(10, 12))
		}, {
			measurementId: "3965", type: "Positioning Strategy", measurementValue: getPositioningStrategy(messageValue.substring(12, 14))
		}, {
			measurementId: "3942", type: "Heartbeat Interval", measurementValue: getMinsByMin(messageValue.substring(14, 18))
		}, {
			measurementId: "3943", type: "Periodic Interval", measurementValue: getMinsByMin(messageValue.substring(18, 22))
		}, {
			measurementId: "3944", type: "Event Interval", measurementValue: getMinsByMin(messageValue.substring(22, 26))
		}, {
			measurementId: "3945", type: "Sensor Enable", measurementValue: getInt(messageValue.substring(26, 28))
		}, {
			measurementId: "3941", type: "SOS Mode", measurementValue: getSOSMode(messageValue.substring(28, 30))
		}
	];
}

function getMotionSetting(str) {
	return [
		{ measurementId: "3946", type: "Motion Enable", measurementValue: getInt(str.substring(0, 2)) },
		{ measurementId: "3947", type: "Any Motion Threshold", measurementValue: getSensorValue(str.substring(2, 6), 1) },
		{ measurementId: "3948", type: "Motion Start Interval", measurementValue: getMinsByMin(str.substring(6, 10)) }
	];
}

function getStaticSetting(str) {
	return [
		{ measurementId: "3949", type: "Static Enable", measurementValue: getInt(str.substring(0, 2)) },
		{ measurementId: "3950", type: "Device Static Timeout", measurementValue: getMinsByMin(str.substring(2, 6)) }
	];
}

function getShockSetting(str) {
	return [
		{ measurementId: "3951", type: "Shock Enable", measurementValue: getInt(str.substring(0, 2)) },
		{ measurementId: "3952", type: "Shock Threshold", measurementValue: getInt(str.substring(2, 6)) }
	];
}

function getTempSetting(str) {
	return [
		{ measurementId: "3953", type: "Temp Enable", measurementValue: getInt(str.substring(0, 2)) },
		{ measurementId: "3954", type: "Event Temp Interval", measurementValue: getMinsByMin(str.substring(2, 6)) },
		{ measurementId: "3955", type: "Event Temp Sample Interval", measurementValue: getSecondsByInt(str.substring(6, 10)) },
		{ measurementId: "3956", type: "Temp ThMax", measurementValue: getSensorValue(str.substring(10, 14), 10) },
		{ measurementId: "3957", type: "Temp ThMin", measurementValue: getSensorValue(str.substring(14, 18), 10) },
		{ measurementId: "3958", type: "Temp Warning Type", measurementValue: getInt(str.substring(18, 20)) }
	];
}

function getLightSetting(str) {
	return [
		{ measurementId: "3959", type: "Light Enable", measurementValue: getInt(str.substring(0, 2)) },
		{ measurementId: "3960", type: "Event Light Interval", measurementValue: getMinsByMin(str.substring(2, 6)) },
		{ measurementId: "3961", type: "Event Light Sample Interval", measurementValue: getSecondsByInt(str.substring(6, 10)) },
		{ measurementId: "3962", type: "Light ThMax", measurementValue: getSensorValue(str.substring(10, 14), 10) },
		{ measurementId: "3963", type: "Light ThMin", measurementValue: getSensorValue(str.substring(14, 18), 10) },
		{ measurementId: "3964", type: "Light Warning Type", measurementValue: getInt(str.substring(18, 20)) }
	];
}

function getShardFlag(str) {
	var bitStr = getByteArray(str);
	return {
		count: parseInt(bitStr.substring(0, 4), 2),
		index: parseInt(bitStr.substring(4), 2)
	};
}

function getBattery(batteryStr) {
	return loraWANV2DataFormat(batteryStr);
}
function getSoftVersion(softVersion) {
	return `${loraWANV2DataFormat(softVersion.substring(0, 2))}.${loraWANV2DataFormat(softVersion.substring(2, 4))}`;
}
function getHardVersion(hardVersion) {
	return `${loraWANV2DataFormat(hardVersion.substring(0, 2))}.${loraWANV2DataFormat(hardVersion.substring(2, 4))}`;
}

function getSecondsByInt(str) {
	return getInt(str);
}

function getMinsByMin(str) {
	return getInt(str);
}

function getSensorValue(str, dig) {
	if (str === "8000") {
		return null;
	} else {
		return loraWANV2DataFormat(str, dig);
	}
}

function bytes2HexString(arrBytes) {
	var str = "";
	var i;
	var tmp;
	var num;
	for (i = 0; i < arrBytes.length; i += 1) {
		num = arrBytes[i];
		if (num < 0) {
			tmp = (255 + num + 1);
			tmp = tmp.toString(16);
		} else {
			tmp = num.toString(16);
		}
		if (tmp.length === 1) {
			tmp = "0" + tmp;
		}
		str += tmp;
	}
	return str;
}
function loraWANV2DataFormat(str, divisor = 1) {
	var strReverse = bigEndianTransform(str);
	var str2 = toBinary(strReverse);
	var arr = [];
	var reverseArr = [];
	if (str2.substring(0, 1) === "1") {
		arr = str2.split("");
		reverseArr = arr.map(function (item) {
			if (parseInt(item) === 1) {
				return 0;
			} else {
				return 1;
			}
		});
		str2 = parseInt(reverseArr.join(""), 2) + 1;
		return parseFloat("-" + str2 / divisor);
	}
	return parseInt(str2, 2) / divisor;
}

function bigEndianTransform(data) {
	var dataArray = [];
	var i;
	for (i = 0; i < data.length; i += 2) {
		dataArray.push(data.substring(i, i + 2));
	}
	return dataArray;
}

function toBinary(arr) {
	var i;
	var binaryData = arr.map(function (item) {
		var data = parseInt(item, 16)
			.toString(2);
		var dataLength = data.length;
		if (data.length !== 8) {
			for (i = 0; i < 8 - dataLength; i += 1) {
				data = `0` + data;
			}
		}
		return data;
	});
	return binaryData.toString().replace(/,/g, "");
}

function getSOSMode(str) {
	return loraWANV2DataFormat(str);
}

function getMacAndRssiObj(pair) {
	var pairs = [];
	var i;
	var mac;
	var rssi;
	if (pair.length % 14 === 0) {
		for (i = 0; i < pair.length; i += 14) {
			mac = getMacAddress(pair.substring(i, i + 12));
			if (mac) {
				rssi = getInt8RSSI(pair.substring(i + 12, i + 14));
				pairs.push({ "mac": "mac", "rssi": rssi });
			}
		}
	}
	return pairs;
}

function getMacAddress(str) {
	var macArr = [];
	var i;
	var mac = "";
	if (str.toLowerCase() === "ffffffffffff") {
		return null;
	}
	for (i = 1; i < str.length; i += 1) {
		if (i % 2 === 1) {
			macArr.push(str.substring(i - 1, i + 1));
		}
	}
	for (i = 0; i < macArr.length; i += 1) {
		mac = mac + macArr[i];
		if (i < macArr.length - 1) {
			mac = mac + ":";
		}
	}
	return mac;
}

function getInt8RSSI(str) {
	return loraWANV2DataFormat(str);
}

function getInt(str) {
	return parseInt(str, 16);
}

function getEventStatus(str) {
	// return getInt(str)
	var bitStr = getByteArray(str);
	var bitArr = [];
	var i;
	var event = [];
	for (i = 0; i < bitStr.length; i += 1) {
		bitArr[i] = bitStr.substring(i, i + 1);
	}
	bitArr = bitArr.reverse();
	for (i = 0; i < bitArr.length; i += 1) {
		if (bitArr[i] === "1") {
			switch (i) {
				case 0:
					event.push({ id: 1, eventName: "Start moving event." });
					break;
				case 1:
					event.push({ id: 2, eventName: "End movement event." });
					break;
				case 2:
					event.push({ id: 3, eventName: "Motionless event." });
					break;
				case 3:
					event.push({ id: 4, eventName: "Shock event." });
					break;
				case 4:
					event.push({ id: 5, eventName: "Temperature event." });
					break;
				case 5:
					event.push({ id: 6, eventName: "Light event." });
					break;
				case 6:
					event.push({ id: 7, eventName: "SOS event." });
					break;
				case 7:
					event.push({ id: 8, eventName: "Press once event." });
					break;
			}
		}
	}
	return event;
}

function getByteArray(str) {
	var bytes = [];
	var i;
	for (i = 0; i < str.length; i += 2) {
		bytes.push(str.substring(i, i + 2));
	}
	return toBinary(bytes);
}

function getWorkingMode(workingMode) {
	return getInt(workingMode);
}

function getPositioningStrategy(strategy) {
	return getInt(strategy);
}

function getUTCTimestamp(str) {
	return parseInt(loraWANV2PositiveDataFormat(str)) * 1000;
}

function loraWANV2PositiveDataFormat(str, divisor = 1) {
	var strReverse = bigEndianTransform(str);
	var str2 = toBinary(strReverse);
	return parseInt(str2, 2) / divisor;
}