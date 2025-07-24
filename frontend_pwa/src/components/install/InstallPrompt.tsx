import React from 'react';
import { Box, Typography, Paper, Divider, useTheme, Stack, Avatar } from '@mui/material';
import ShareIcon from '@mui/icons-material/IosShare';
import AddBoxIcon from '@mui/icons-material/AddBox';
import HomeIcon from '@mui/icons-material/Home';

const InstallPrompt: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor={theme.palette.background.default}
      px={2}
    >
      <Paper
        elevation={4}
        sx={{
          p: 3,
          maxWidth: 400,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}
      >
        <Typography variant="h5" align="center" gutterBottom>
          PalliRoute installieren
        </Typography>
        <Stack spacing={2}>
          {/* Schritt 1 */}
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
              <ShareIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                1. Schritt
              </Typography>
              <Typography variant="body2">
                Tippen Sie die Schaltfläche <b>„Teilen“</b> in der Werkzeugleiste an.
              </Typography>
            </Box>
          </Box>
          <Divider />
          {/* Schritt 2 */}
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
              <AddBoxIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                2. Schritt
              </Typography>
              <Typography variant="body2">
                Wischen Sie nach oben und wählen Sie <b>Zum Startbildschirm hinzufügen</b> aus dem Menü aus.
              </Typography>
            </Box>
          </Box>
          <Divider />
          {/* Schritt 3 */}
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
              <HomeIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                3. Schritt
              </Typography>
              <Typography variant="body2">
                Starten Sie PalliRoute vom Startbildschirm.
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default InstallPrompt; 