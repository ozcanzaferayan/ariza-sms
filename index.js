const cheerio = require('cheerio');
const fetch = require('node-fetch');
const twilio = require('twilio');
const fs = require('fs');
require('dotenv').config();

const emptyChar = '⠀';
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


fetch("https://www.iski.istanbul/web/tr-TR/ariza-kesinti")
    .then(res => res.text())
    .then(res => evalRes(res));

let evalRes = (res) => {
    const $ = cheerio.load(res);
    tables = getFailureTables($);
    const smsText = createSmsText($, tables);
    if (smsText.length === 0) {
        console.log('Failure not happened');
        return;
    }
    writeSmsToFile(smsText);
    sendSmsToRecievers(smsText);
}

let getFailureTables = ($) => {
    return $('.table.table-bordered.table-hover');
}

let createSmsText = ($, tables) => {
    let smsTextArray = [];
    tables.each((i, v) => {
        let trList = $(v).find('tbody tr');

        let tdDistrict = trList.eq(1).find('td');
        let tdNeighborhood = trList.eq(2).find('td');
        let tdStartDate = trList.eq(5).find('td');
        let tdEndDate = trList.eq(6).find('td');

        let district = tdDistrict.eq(2).text().trim();
        let neighbourhoods = tdNeighborhood.eq(2).text().trim();
        let startDate = tdStartDate.eq(2).text().trim();
        let endDate = tdEndDate.eq(2).text().trim();

        if (!district.includes(process.env.DISTRICT_NAME)) {
            return;
        }
        let failureObject = { district, neighbourhoods, startDate, endDate };
        smsTextArray.push(createSmsLine($, failureObject));
    });
    if (smsTextArray.length === 0) return "";
    return `${emptyChar}\n${emptyChar}\n${smsTextArray.join('\n')}\n${emptyChar}\n${emptyChar}`;
}

let createSmsLine = ($, failure) => {
    return `${failure.district}\n${failure.neighbourhoods}\n${failure.startDate}\n${failure.endDate}`;
}

let writeSmsToFile = (sms) => {
    fs.writeFile('sms.txt', sms, function(err) {
        if (err) return console.log(err);
        console.log('Written sms.txt');
    });
}

let sendSmsToRecievers = (smsText) => {
    const receivers = process.env.MSISDN_RECEIVERS_DELIMITED_WITH_SEMICOLON;
    receivers.split(';').forEach(receiver => {
        client.messages.create({
                to: receiver,
                from: process.env.MSISDN_SENDER,
                body: smsText
            })
            .then(message => console.log('Sent', 'SID', message.sid))
            .catch(error => console.log('Sending error', error));
    });

}