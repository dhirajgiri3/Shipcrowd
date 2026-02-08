import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanyGroup extends Document {
  name: string;
  description?: string;
  companyIds: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyGroupSchema = new Schema<ICompanyGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    companyIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Company',
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

CompanyGroupSchema.index({ name: 1 });
CompanyGroupSchema.index({ isDeleted: 1 });

const CompanyGroup = mongoose.model<ICompanyGroup>('CompanyGroup', CompanyGroupSchema);

export default CompanyGroup;
