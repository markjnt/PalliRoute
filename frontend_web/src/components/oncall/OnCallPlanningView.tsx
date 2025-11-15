import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export const OnCallPlanningView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rufbereitschaft Planen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Hier können Sie die Rufbereitschaft verwalten und planen.
        </Typography>
      </Paper>
    </Box>
  );
};

