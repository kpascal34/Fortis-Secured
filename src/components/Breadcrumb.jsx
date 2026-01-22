import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AiOutlineHome, AiOutlineRight } from 'react-icons/ai';

/**
 * Breadcrumb Navigation Component
 * Displays the current navigation path and allows users to navigate back
 */
const Breadcrumb = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Don't show breadcrumb on home page or portal root
  if (pathname === '/' || pathname === '/portal' || pathname === '/portal/') {
    return null;
  }

  // Parse route segments
  const segments = pathname
    .split('/')
    .filter((segment) => segment !== '' && segment !== 'portal')
    .map((segment) => {
      // Convert kebab-case to Title Case
      return segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });

  // Build breadcrumb path
  const breadcrumbs = [{ label: 'Home', path: '/' }];

  let currentPath = '';
  if (pathname.startsWith('/portal')) {
    breadcrumbs.push({ label: 'Portal', path: '/portal' });
    currentPath = '/portal';

    pathname
      .replace('/portal/', '')
      .split('/')
      .filter((s) => s)
      .forEach((segment, index) => {
        currentPath += `/${segment}`;
        breadcrumbs.push({
          label: segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          path: currentPath,
        });
      });
  } else {
    pathname
      .split('/')
      .filter((s) => s)
      .forEach((segment, index) => {
        currentPath += `/${segment}`;
        breadcrumbs.push({
          label: segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          path: currentPath,
        });
      });
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-white/60 mb-4 px-2" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.path} className="flex items-center gap-2">
            {isLast ? (
              <span className="text-white font-medium">{crumb.label}</span>
            ) : (
              <>
                {index === 0 ? (
                  <Link to={crumb.path} className="hover:text-white transition-colors flex items-center gap-1">
                    <AiOutlineHome className="text-base" />
                    <span>{crumb.label}</span>
                  </Link>
                ) : (
                  <Link to={crumb.path} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                )}
                {index < breadcrumbs.length - 1 && <AiOutlineRight className="text-xs opacity-40" />}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
