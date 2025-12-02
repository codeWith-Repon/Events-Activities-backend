import { Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { eventParticipantService } from "./eventParticipant.service"
import { sendResponse } from "../../utils/sendResponse"
import status from "http-status"
import pick from "../../helpers/pick"
import { eventParticipantFilterableFields } from "./eventParticipant.constants"



const createEventParticipant = catchAsync(
    async (req: Request, res: Response) => {

        const result = await eventParticipantService.createEventParticipant(req.body, req.user)
        sendResponse(res, {
            statusCode: status.CREATED,
            success: true,
            message: "Successfully joined the event",
            data: result
        })
    }
)

const getAllEventParticipants = catchAsync(
    async (req: Request, res: Response) => {

        const options = pick(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);

        const filter = pick(req.query, eventParticipantFilterableFields);
        const result = await eventParticipantService.getAllEventParticipants(filter, options)

        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Successfully joined the event",
            data: result
        })
    }
)

export const EventParticipantController = {
    createEventParticipant,
    getAllEventParticipants
}