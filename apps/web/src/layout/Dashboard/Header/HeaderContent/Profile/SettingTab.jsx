// material-ui
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// assets
import CommentOutlined from '@ant-design/icons/CommentOutlined';
import LockOutlined from '@ant-design/icons/LockOutlined';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import UnorderedListOutlined from '@ant-design/icons/UnorderedListOutlined';

// ==============================|| HEADER PROFILE - SETTING TAB ||============================== //

export default function SettingTab() {
  return (
    <List component="nav" sx={{ p: 0, '& .MuiListItemIcon-root': { minWidth: 32 } }}>
      <ListItemButton disabled>
        <ListItemIcon>
          <QuestionCircleOutlined />
        </ListItemIcon>
        <ListItemText primary="Ayuda" />
      </ListItemButton>
      <ListItemButton disabled>
        <ListItemIcon>
          <UserOutlined />
        </ListItemIcon>
        <ListItemText primary="Cuenta" />
      </ListItemButton>
      <ListItemButton disabled>
        <ListItemIcon>
          <LockOutlined />
        </ListItemIcon>
        <ListItemText primary="Privacidad" />
      </ListItemButton>
      <ListItemButton disabled>
        <ListItemIcon>
          <CommentOutlined />
        </ListItemIcon>
        <ListItemText primary="Comentarios" />
      </ListItemButton>
      <ListItemButton disabled>
        <ListItemIcon>
          <UnorderedListOutlined />
        </ListItemIcon>
        <ListItemText primary="Historial" />
      </ListItemButton>
    </List>
  );
}
