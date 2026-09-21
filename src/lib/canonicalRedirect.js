// Exact hostname match avoids redirecting www/candidate requests to themselves.
export function canonicalRedirect(request) {
  const target = new URL(request.url);
  if (target.hostname !== 'bglarp.com') return null;
  target.protocol = 'https:';
  target.hostname = 'www.bglarp.com';
  target.port = '';
  return Response.redirect(target.href, 308);
}
