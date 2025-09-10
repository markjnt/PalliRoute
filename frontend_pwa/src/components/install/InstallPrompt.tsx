import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, useTheme, Stack, Avatar, Button } from '@mui/material';
import ShareIcon from '@mui/icons-material/IosShare';
import AddBoxIcon from '@mui/icons-material/AddBox';
import HomeIcon from '@mui/icons-material/Home';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const theme = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

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
        
        {showInstallButton && (
          <Box mb={3} display="flex" justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<InstallMobileIcon />}
              onClick={handleInstallClick}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(0, 122, 255, 0.4)',
                }
              }}
            >
              Jetzt installieren
            </Button>
          </Box>
        )}
        
        <Typography variant="body2" align="center" color="text.secondary" mb={2}>
          {showInstallButton 
            ? "Oder folgen Sie den manuellen Schritten unten:"
            : "Falls die automatische Installation nicht funktioniert, folgen Sie diesen Schritten:"
          }
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