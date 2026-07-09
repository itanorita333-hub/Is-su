const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const channelInfo = {
    contextInfo: { forwardingScore: 0, isForwarded: false }
};

function safeWriteJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function clearSessionCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        const rootDir = path.resolve(__dirname, '..');
        const sessionDir = path.join(rootDir, 'session');
        const conflictPath = path.join(rootDir, 'data', 'conflictState.json');
        const qrStatePath = path.join(rootDir, 'data', 'qrState.json');

        await sock.sendMessage(chatId, {
            text: '🧹 Clearing session state and preparing a fresh login. The bot will restart shortly.',
            ...channelInfo
        });

        const errors = [];
        const actions = [];

        try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            fs.mkdirSync(sessionDir, { recursive: true });
            actions.push('Session directory wiped and recreated');
        } catch (error) {
            errors.push(`Failed to reset session folder: ${error.message}`);
        }

        try {
            fs.rmSync(conflictPath, { force: true });
            actions.push('Conflict state reset');
        } catch (error) {
            if (fs.existsSync(conflictPath)) {
                errors.push(`Failed to reset conflict state: ${error.message}`);
            }
        }

        try {
            safeWriteJson(qrStatePath, { status: 'resetting', timestamp: Date.now() });
            actions.push('QR state updated to resetting');
        } catch (error) {
            errors.push(`Failed to update QR state: ${error.message}`);
        }

        const summaryLines = [];
        if (actions.length) summaryLines.push(`✅ ${actions.join('\n✅ ')}`);
        if (errors.length) summaryLines.push(`⚠️ ${errors.join('\n⚠️ ')}`);

        await sock.sendMessage(chatId, {
            text: `*Clear Session Result:*
${summaryLines.join('\n')}`,
            ...channelInfo
        });

        if (errors.length === 0) {
            setTimeout(() => process.exit(1), 750);
        }

    } catch (error) {
        console.error('Error in clearsession command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to clear session files!',
            ...channelInfo
        });
    }
}

module.exports = clearSessionCommand; 