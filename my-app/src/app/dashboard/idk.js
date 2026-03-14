const handleSubmit = async (data) => {
  try {
    const payload = {
      ...data,
      email: user?.primaryEmailAddress?.emailAddress || "",
    };

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(result.error);
      alert("Failed to save profile");
      return;
    }

    router.push("/course-plan");
  } catch (error) {
    console.error("Submit error:", error);
    alert("Something went wrong");
  }
};