/**
 * Resolve the current saved folder name from the URL or DOM heading.
 *
 * Instagram Saved URL patterns:
 *   https://www.instagram.com/USER_NAME/saved/
 *   https://www.instagram.com/USER_NAME/saved/all-posts/
 *   https://www.instagram.com/USER_NAME/saved/FOLDER_NAME/17906821706655495/
 *   https://www.instagram.com/saved/
 */
export function detectFolderFromUrl(): string {
  const path = location.pathname;

  // Try extracting H1 heading from DOM first if available
  const h1 = document.querySelector('h1')?.textContent?.trim();
  if (h1 && h1 !== 'Saved' && h1 !== 'Profile') {
    return h1;
  }

  // Regex to capture folder slug from /saved/<folder_name>/<collection_id>/ or /<user>/saved/<folder_name>/<collection_id>/
  const match = path.match(/\/saved\/(?:([^/]+)\/(?:([^/]+)\/?)?)?/i);
  if (!match || !match[1] || match[1] === 'all-posts' || match[1] === 'all') {
    return 'All Posts';
  }

  const slug = decodeURIComponent(match[1]);
  if (!slug || slug === 'all-posts' || slug === 'all') {
    return 'All Posts';
  }

  // Format slug e.g. "my_saved_reels" -> "My Saved Reels"
  return formatFolderName(slug);
}

function formatFolderName(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
