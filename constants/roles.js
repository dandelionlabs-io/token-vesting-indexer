const ADMIN = '0x2c25c76dbfd2d67c0d764fd0ab0d786279b3e015eb744e5f25da2cc6c576c2e4';
const OPERATOR = '0xaeb7c7d0e674cc9797d54e42cf23c430de43c016789450024ae5ec0cbee9b98e';
const STAKEHOLDER = 'STAKEHOLDER';

function roleCodeToName(code) {
    switch (code) {
        case ADMIN: return 'ADMIN'
        case OPERATOR: return 'OPERATOR'
        case STAKEHOLDER: return 'STAKEHOLDER'
        default: return 'UNRECOGNIZED'
    }
}

function roleNameToCode(name) {
    switch (code) {
        case 'ADMIN': return ADMIN
        case 'OPERATOR': return OPERATOR
        default: throw "Not found"
    }
}

module.exports = {
    roleCodeToName,
    roleNameToCode
}
