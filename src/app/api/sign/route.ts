import { CgPluginLibHost } from "@common-ground-dao/cg-plugin-lib-host";

export async function POST(req: Request) {
    const privateKey = process.env.NEXT_PRIVATE_PRIVKEY;
    const publicKey = process.env.NEXT_PUBLIC_PUBKEY;

    if (!privateKey || !publicKey) {
        return Response.json(
            { error: "Plugin keys not configured" },
            { status: 500 }
        );
    }

    const body = await req.json();
    const cgPluginLibHost = await CgPluginLibHost.initialize(privateKey, publicKey);
    const { request, signature } = await cgPluginLibHost.signRequest(body);

    return Response.json({ request, signature });
}
