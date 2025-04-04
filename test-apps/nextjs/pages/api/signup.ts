import { auth } from "../../lib/lucia";
import { AuthRequest } from "@lucia-auth/nextjs";
import { LuciaError } from "lucia-auth";
import { Prisma } from "@prisma/client";

import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
	error?: string;
};

export default async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	if (req.method !== "POST")
		return res.status(404).json({ error: "Not found" });
	const { username, password } =
		typeof req.body === "string" ? JSON.parse(req.body) : req.body;
	if (!username || !password) {
		return res.status(200).json({
			error: "Invalid input"
		});
	}
	try {
		const user = await auth.createUser({
			primaryKey: {
				providerId: "username",
				providerUserId: username,
				password
			},
			attributes: {
				username
			}
		});
		const session = await auth.createSession(user.userId);
		const authRequest = new AuthRequest(auth, req, res);
		authRequest.setSession(session);
		return res.redirect(302, "/");
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002" &&
			error.message?.includes("username")
		) {
			return res.status(200).json({
				error: "Username already in use"
			});
		}
		if (
			error instanceof LuciaError &&
			error.message === "AUTH_DUPLICATE_KEY_ID"
		) {
			return res.status(200).json({
				error: "Username already in use"
			});
		}
		// database connection error
		console.error(error);
		return res.status(200).json({
			error: "Unknown error occurred"
		});
	}
};
