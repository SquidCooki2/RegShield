/** The server sends { error } with a message meant for the user; fall back to the status code. */
export const errorMessage = (status: number, body: string) => {
  try {
    const message = JSON.parse(body).error;
    if (typeof message === "string") return message;
  } catch {
    // not JSON
  }
  return `The server responded with ${status}.`;
};

/** fetch + JSON body; throws with the server's error message when the response isn't ok. */
export const sendJson = async (url: string, method: string, body: unknown) => {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
  return res.json();
};
