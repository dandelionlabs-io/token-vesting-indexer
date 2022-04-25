/**
 * @description Sleeps the code for few seconds
 * @param {Integer} seconds interval to wait before waiting
 * @returns
 */
const timeOut = async function (seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

module.exports = {
    timeOut
};
