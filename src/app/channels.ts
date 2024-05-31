import { getChannels } from "@/core/channels/get";
import { listenChannel } from "@/core/channels/listen";
import { bearerToken } from "@/services/hono/middlewares/bearer-token";
import { createApp } from "@/services/hono/utils/create-app";
import { twitchClient } from "@/services/twicth/client";
import { zValidator } from '@hono/zod-validator'
import { getChannel, isListening } from "orm/functions/channels/get-channels";
import { unlistenChannelSQL } from "orm/functions/channels/listen-channel";
import { z } from 'zod';

export const channels = createApp().basePath('/channels');

channels.post(
    '/listen',
    bearerToken(),
    async (c) => {
        const { authorization } = c.req.header()
        const token = authorization.split(' ')[1]

        try {
            const validateToken = await twitchClient.validateToken(token)

            await listenChannel(validateToken.login, token);

            return c.json({
                success: true
            }, 200);
        } catch (error) {
            console.error(error)

            return c.json({ success: false, message: 'Internal Server Error' }, 500);
        }
    }
)

channels.post('/unlisten', bearerToken(), async (c) => {
    const { authorization } = c.req.header()
    const token = authorization.split(' ')[1]

    try {
        const validateToken = await twitchClient.validateToken(token)

        await unlistenChannelSQL(validateToken.login)

        return c.json({
            success: true
        }, 200);
    } catch (error) {
        return c.json({ success: false, message: 'Internal Server Error' }, 500);
    }
})

channels.get('/', async (c) => {
    const channels = await getChannels()

    return c.json(channels, 200)
})

channels.get('/listening', zValidator('query', z.object({ channel: z.string() }), ({ success }, c) => {
    if (!success) return c.json({ success: false, message: 'Invalid request' }, 400);
}), async (c) => {
    const channel = c.req.query('channel') ?? ''

    try {
        const listening = await isListening(channel)
        console.log(listening)

        return c.json({
            success: listening,
        }, 200)
    } catch (error) {

        return c.json({ success: false, message: 'Channel not found' }, 404);
    }
})

channels.get('/:username', async (c) => {
    const { username } = c.req.param()

    try {
        const channels = await getChannel(username)

        return c.json(channels, 200)
    } catch (error) {
        console.error(error)
        return c.json({ success: false, message: 'Channel not found' }, 404);
    }
})

