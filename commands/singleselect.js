const { sendInteractiveButtons } = require('../lib/interactiveButtons')

async function singleSelectCommand(sock, chatId, message) {
    const rows = [
        { title: '📜 Menu', description: 'Show all bot commands', id: '.menu' },
        { title: '🌐 Website', description: 'Open project website', id: 'https://github.com/atex-ovi/wabase-button.git', url: 'https://github.com/atex-ovi/wabase-button.git' },
        { title: '✅ Alive', description: 'Check bot uptime/status', id: '.alive' }
    ]

    await sendInteractiveButtons(sock, chatId, {
        text: 'Single Select Demo\n\nChoose one command from the list below:',
        footer: 'Ilussion Bot',
        buttons: [
            {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: 'Open Command List',
                    sections: [
                        {
                            title: 'Quick Commands',
                            rows
                        }
                    ]
                })
            }
        ]
    })
}

module.exports = singleSelectCommand
