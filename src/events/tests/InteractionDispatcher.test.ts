import { Interaction } from 'discord.js';
import { UserFacingError } from '../../errors';
import { flushPromises, mockServices } from '../../tests/mocks';
import { CommandHandler, Handler } from '../../types/Handler';
import { HandlerRegistry } from '../HandlerRegistry';
import { InteractionDispatcher } from '../InteractionDispatcher';

function rawCommand(name = 'help') {
    return {
        id: '1001', user: { id: '111', username: 'tester' }, guildId: '9001', commandName: name,
        deferred: false, replied: false,
        reply: jest.fn().mockResolvedValue(undefined),
        isAutocomplete: () => false, isChatInputCommand: () => true, isButton: () => false,
        isStringSelectMenu: () => false, isModalSubmit: () => false, isMessageComponent: () => false,
        options: { getSubcommand: () => null },
    };
}

function rawAutocomplete(focused: string) {
    return {
        id: '1002', user: { id: '111', username: 'tester' }, guildId: '9001', commandName: 'lfg',
        respond: jest.fn().mockResolvedValue(undefined),
        isAutocomplete: () => true,
        options: { getFocused: () => focused, getSubcommand: () => 'play' },
    };
}

function setup(command: Partial<CommandHandler>) {
    const services = mockServices({
        users: { ensure: jest.fn().mockResolvedValue({ id: 'acc-1', discord_id: '111' }) },
        analytics: { record: jest.fn() },
    });
    const handler = { name: 'help', data: {} as CommandHandler['data'], execute: jest.fn().mockResolvedValue(undefined), ...command } as CommandHandler;
    const registry = new HandlerRegistry({ commands: [handler], buttons: [], selects: [], modals: [] });
    return { services, handler, dispatcher: new InteractionDispatcher(services, registry) };
}

const recorded = (services: ReturnType<typeof setup>['services']): Record<string, unknown> =>
    (services.analytics.record as jest.Mock).mock.calls[0][0] as Record<string, unknown>;

describe('InteractionDispatcher', () => {
    it('runs the handler and records an ok event', async () => {
        const { services, handler, dispatcher } = setup({});
        dispatcher.dispatch(rawCommand() as unknown as Interaction);
        await flushPromises();
        expect(handler.execute).toHaveBeenCalled();
        expect(recorded(services)).toMatchObject({ interactionType: 'command', interactionName: 'help', outcome: 'ok', userId: '111', flowId: '1001', executionId: '1001' });
    });

    it('logs every interaction it receives', async () => {
        const { services, dispatcher } = setup({});
        const raw = rawCommand();
        dispatcher.dispatch(raw as unknown as Interaction);
        await flushPromises();
        expect(services.log.logInteractionReceived).toHaveBeenCalledWith(raw, 'command help');
    });

    it('shows a user-facing error, and logs it as a refusal rather than an error', async () => {
        const { services, dispatcher } = setup({ execute: jest.fn().mockRejectedValue(new UserFacingError('Pick a game')) });
        const raw = rawCommand();
        dispatcher.dispatch(raw as unknown as Interaction);
        await flushPromises();
        expect(JSON.stringify(raw.reply.mock.calls[0][0])).toContain('Pick a game');
        expect(recorded(services)).toMatchObject({ outcome: 'error', errorCode: 'UserFacingError' });
        expect(services.log.error).not.toHaveBeenCalled();
        expect(services.log.log).toHaveBeenCalledWith(expect.stringContaining('refused for tester (111) in server 9001: Pick a game'));
    });

    it('logs an unexpected error and shows a generic message', async () => {
        const { services, dispatcher } = setup({ execute: jest.fn().mockRejectedValue(new Error('db down')) });
        const raw = rawCommand();
        dispatcher.dispatch(raw as unknown as Interaction);
        await flushPromises();
        expect(services.log.error).toHaveBeenCalledWith(expect.stringMatching(/command help failed for tester \(111\) in server 9001\n.*db down/s));
        expect(JSON.stringify(raw.reply.mock.calls[0][0])).toContain('Something went wrong');
    });

    it('records a missed response window as a timeout', async () => {
        const { services, dispatcher } = setup({ execute: jest.fn().mockRejectedValue(Object.assign(new Error('Unknown interaction'), { code: 10062 })) });
        dispatcher.dispatch(rawCommand() as unknown as Interaction);
        await flushPromises();
        expect(recorded(services)).toMatchObject({ outcome: 'timeout', errorCode: '10062' });
    });

    it('records an unknown command as an error', async () => {
        const { services, dispatcher } = setup({});
        dispatcher.dispatch(rawCommand('nope') as unknown as Interaction);
        await flushPromises();
        expect(recorded(services)).toMatchObject({ interactionName: 'nope', outcome: 'error' });
    });

    it('records a zero-result autocomplete as a search', async () => {
        const { services } = setup({});
        const registry = new HandlerRegistry({ commands: [{ name: 'lfg', data: {} as CommandHandler['data'], execute: jest.fn(), autocomplete: jest.fn().mockResolvedValue([]) }], buttons: [], selects: [], modals: [] });
        const raw = rawAutocomplete('Half-Life 3');
        new InteractionDispatcher(services, registry).dispatch(raw as unknown as Interaction);
        await flushPromises();
        expect(raw.respond).toHaveBeenCalledWith([]);
        expect(recorded(services)).toMatchObject({ interactionType: 'search', interactionName: 'lfg play', detail: 'Half-Life 3' });
    });

    it('does not record an autocomplete that found something', async () => {
        const { services } = setup({});
        const registry = new HandlerRegistry({ commands: [{ name: 'lfg', data: {} as CommandHandler['data'], execute: jest.fn(), autocomplete: jest.fn().mockResolvedValue([{ name: 'Portal 2', value: 'g' }]) }], buttons: [], selects: [], modals: [] });
        new InteractionDispatcher(services, registry).dispatch(rawAutocomplete('port') as unknown as Interaction);
        await flushPromises();
        expect(services.analytics.record).not.toHaveBeenCalled();
    });
});

describe('HandlerRegistry', () => {
    it('refuses two handlers with the same name', () => {
        const twin: Handler<never> = { name: 'lfg_interested', execute: jest.fn() };
        expect(() => new HandlerRegistry({ commands: [], buttons: [twin, twin], selects: [], modals: [] })).toThrow('lfg_interested');
    });
});
