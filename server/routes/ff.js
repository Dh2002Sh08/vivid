import express from 'express';
import Favourite from '../models/Favourite.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  try {
    const favourites = await Favourite.find({ userId }).sort({ createdAt: -1 });
    res.json(favourites);
  } catch (error) {
    console.error('Failed to fetch favourites:', error);
    res.status(500).json({ message: 'Failed to fetch favourites' });
  }
});

router.post('/', async (req, res) => {
  const { userId, performerId, performerName, performerImage, league, metadata } = req.body;
  if (!userId || !performerId || !performerName) {
    return res.status(400).json({ message: 'userId, performerId, and performerName are required' });
  }

  try {
    const existing = await Favourite.findOne({ userId, performerId });
    if (existing) return res.status(200).json(existing);

    const favourite = await Favourite.create({
      userId,
      performerId,
      performerName,
      performerImage,
      league,
      metadata
    });

    res.status(201).json(favourite);
  } catch (error) {
    console.error('Failed to create favourite:', error);
    res.status(500).json({ message: 'Failed to create favourite' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Favourite.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete favourite:', error);
    res.status(500).json({ message: 'Failed to delete favourite' });
  }
});

export default router;
