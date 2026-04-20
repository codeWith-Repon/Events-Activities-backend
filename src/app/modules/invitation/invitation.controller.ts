import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { invitationService } from "./invitation.service";

const sendInvitation = catchAsync(async (req: Request, res: Response) => {
  const result = await invitationService.sendInvitation(req.body, req.user);
  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Invitation sent successfully",
    data: result
  });
});

const acceptInvitation = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as { token: string };
  const result = await invitationService.acceptInvitation(token, req.user);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Invitation accepted — you have joined the event",
    data: result
  });
});

const declineInvitation = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as { token: string };
  const result = await invitationService.declineInvitation(token, req.user);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Invitation declined",
    data: result
  });
});

const revokeInvitation = catchAsync(async (req: Request, res: Response) => {
  const { invitationId } = req.params as { invitationId: string };
  const result = await invitationService.revokeInvitation(invitationId, req.user);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Invitation revoked",
    data: result
  });
});

const listEventInvitations = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params as { eventId: string };
  const result = await invitationService.listEventInvitations(eventId, req.user);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Invitations retrieved successfully",
    data: result
  });
});

export const invitationController = {
  sendInvitation,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
  listEventInvitations
};
