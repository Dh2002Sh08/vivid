import mongoose from 'mongoose';

const favouriteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    performerId: { type: String, required: true },
    performerName: { type: String, required: true },
    performerImage: String,
    league: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export default mongoose.model('Favourite', favouriteSchema);
