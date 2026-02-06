import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

// PEM keys in env vars often have literal '\n' instead of real newlines
function normalizePem(key: string): string {
    return key.replace(/\\n/g, '\n');
}

export async function POST(req: Request) {
    const rawPrivateKey = process.env.NEXT_PRIVATE_PRIVKEY;
    const rawPublicKey = process.env.NEXT_PUBLIC_PUBKEY;

    if (!rawPrivateKey || !rawPublicKey) {
        return Response.json(
            { error: "Plugin keys not configured" },
            { status: 500 }
        );
    }

    const privateKey = normalizePem(rawPrivateKey);
    const publicKey = normalizePem(rawPublicKey);

    try {
        const body = await req.json();
        const cgPluginLibHost = await CgPluginLibHost.initialize(privateKey, publicKey);
        const { request, signature } = await cgPluginLibHost.signRequest(body);

        return Response.json({ request, signature });
    } catch (err) {
        console.error('[UC] Sign error:', err);
        return Response.json(
            { error: "Signing failed" },
            { status: 500 }
        );
    }
}
