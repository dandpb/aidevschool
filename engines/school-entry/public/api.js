export async function api(
  path,
  { method = "GET", body, csrfToken, signal } = {},
) {
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  const response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Não foi possível ler a resposta. Tente novamente.");
  }
  if (!response.ok) {
    const error = new Error(
      data.error?.message || "Não foi possível concluir. Tente novamente.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
