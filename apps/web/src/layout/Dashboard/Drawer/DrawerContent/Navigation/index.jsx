// material-ui
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project import
import NavGroup from './NavGroup';
import menuItem from 'menu-items';
import { canAccessGlobalCatalogs } from 'hooks/use-access-control';
import { canAccessProfile } from 'hooks/use-access-control';
import { useActiveSession } from 'hooks/use-active-session';

// ==============================|| DRAWER CONTENT - NAVIGATION ||============================== //

export default function Navigation() {
  const session = useActiveSession();

  const navGroups = menuItem.items
    .map((item) => {
      if (item.type !== 'group') {
        return item;
      }

      const children = (item.children || []).filter((menuEntry) => {
        if ('globalOnly' in menuEntry && menuEntry.globalOnly) {
          if (!canAccessGlobalCatalogs(session)) {
            return false;
          }
        }

        if ('anyOf' in menuEntry && menuEntry.anyOf?.length) {
          return menuEntry.anyOf.some((profile) => canAccessProfile(session, profile));
        }

        return canAccessProfile(session, {
          permission: menuEntry.permission,
          capability: menuEntry.capability,
          capabilities: menuEntry.capabilities
        });
      });

      return {
        ...item,
        children
      };
    })
    .filter((item) => item && (item.type !== 'group' || item.children?.length))
    .map((item) => {
      switch (item.type) {
        case 'group':
          return <NavGroup key={item.id} item={item} />;
        default:
          return (
            <Typography key={item.id} variant="h6" color="error" align="center">
              Fix - Navigation Group
            </Typography>
          );
      }
    });

  return <Box sx={{ pt: 2 }}>{navGroups}</Box>;
}
