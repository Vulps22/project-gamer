import { UserFacingError } from '../../errors';
import { Services } from '../../services';
import { LfgPost } from '../../types/models';

/** The LFG post a button belongs to, if its session is still running. */
export async function activePost(services: Services, postId: string | undefined): Promise<LfgPost> {
    const post = postId ? await services.lfg.getById(postId) : null;
    if (!post || post.status !== 'active') {
        throw new UserFacingError('This session has ended.');
    }
    return post;
}
