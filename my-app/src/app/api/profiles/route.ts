import { NextResponse } from "next/server";
import { createProfile, getProfileByEmail, updateProfile } from "@/lib/profile";

export async function POST(req) {
  try {
    const payload = await req.json();

    const email = payload.email;

    const existed = await getProfileByEmail(email);

    if (existed) {
      const updates = {
        plan: {
          university: payload.plan.university,
          faculty: payload.plan.faculty,
          specialisation: payload.plan.specialisation,
          major: payload.plan.major,
          minor: payload.plan.minor,
          yearStart: payload.plan.yearStart,
          yearEnd: payload.plan.yearEnd,
        },
      };

      console.log("payload and updates", payload, updates);

      const data = await updateProfile(email, updates);
      return NextResponse.json(data);
    }

    const data = await createProfile(payload);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    const data = await getProfileByEmail(email);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { email, updates } = await req.json();

    const data = await updateProfile(email, updates);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
