import { beta } from '@tamurt/server';
import { apiRoute } from '@/lib/api';

export const GET = apiRoute(async ({ ctx }) => beta.publicBetaInfo(ctx));
