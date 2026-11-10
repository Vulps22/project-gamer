import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHandlerRegistry } from '..';
import { loadComponentHandlers } from '../loadComponentHandlers';

describe('loadComponentHandlers', () => {
    it('answers every component by its folder and name, as PE does', () => {
        const registry = createHandlerRegistry();
        expect([...registry.buttons.keys()].sort()).toEqual([
            'lfg_interested', 'lfg_notInterested', 'lfg_openInvite',
            'library_haveGame', 'library_postGame',
            'submission_approve', 'submission_reject',
        ]);
        expect([...registry.selects.keys()]).toEqual(['lfg_playerSelect']);
        expect([...registry.modals.keys()]).toEqual(['submission_approveModal']);
    });

    it('refuses two handlers answering the same ID', () => {
        const dir = mkdtempSync(join(tmpdir(), 'pg-handlers-'));
        mkdirSync(join(dir, 'lfg'));
        const handler = 'module.exports = { default: { name: "interested", execute: async () => {} } };';
        writeFileSync(join(dir, 'lfg', 'interested.js'), handler);
        writeFileSync(join(dir, 'lfg', 'interestedAgain.js'), handler);
        expect(() => loadComponentHandlers(dir)).toThrow('Two handlers answer lfg_interested');
    });

    it('refuses a file with no handler', () => {
        const dir = mkdtempSync(join(tmpdir(), 'pg-handlers-'));
        writeFileSync(join(dir, 'helper.js'), 'module.exports = { helper: () => 1 };');
        expect(() => loadComponentHandlers(dir)).toThrow('has no default-exported handler');
    });
});
