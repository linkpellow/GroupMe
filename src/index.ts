res.status(200).json({
  success: true,
  leadId: (lead._id as mongoose.Types.ObjectId).toString(),
  message: 'Lead successfully created',
  state: lead.state,
  zipcode: lead.zipcode,
  city: lead.city
}); 