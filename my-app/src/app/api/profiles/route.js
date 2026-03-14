import { supabase } from "../../../lib/supabase/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  return NextResponse.json(data)
}

export async function POST(req) {
  const body = await req.json()

  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        student_email: body.email,
        plan: {
          university: body.university,
          faculty: body.faculty,
          degree: body.degree,
          specialisation: body.specialisation,
          major: body.major,
          minor: body.minor,
          year_start: body.yearStart,
          year_end: body.yearEnd,
          choosen_unit_id: [] // array of units
        }
      }
    ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PUT(req) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("profiles")
      .update({
        plan: {
          university: body.university,
          faculty: body.faculty,
          degree: body.degree,
          specialisation: body.specialisation || "",
          major: body.major || "",
          minor: body.minor || "",
          year_start: body.yearStart,
          year_end: body.yearEnd,
          choosen_unit_id: body.choosen_unit_id || [],
        },
      })
      .eq("student_email", body.email)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  const body = await req.json()

  const { data, error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", body.id)

  return NextResponse.json({ data, error })
}