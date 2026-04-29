module.exports = {
    default: {
        require: ['step_definitions/*.js', 'support/world.js', 'support/hooks.js'],
        format: ['progress', 'json:reports/cucumber-report.json'],
        publishQuiet: true
    }
};