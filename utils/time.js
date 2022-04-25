const getCurrentTimeString = function () {
    let currentdate = new Date();
    return `${currentdate.getDate()}/${
        currentdate.getMonth() + 1
    }/${currentdate.getFullYear()} ${currentdate.getHours()}:${currentdate.getMinutes()}:${currentdate.getSeconds()}`;
};

module.exports = {
    getCurrentTimeString
}
