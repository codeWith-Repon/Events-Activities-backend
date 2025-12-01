import { Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { EventsService } from "./events.service"
import { sendResponse } from "../../utils/sendResponse"
import status from "http-status"


const createEvent = catchAsync(
    async (req: Request, res: Response) => {
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.body.images = req.files.map(file => file.path)
        }

        const result = await EventsService.createEvent(req.body, req.user)
        sendResponse(res, {
            statusCode: status.CREATED,
            success: true,
            message: "Event created successfully",
            data: result
        })
    }
)

const getAllEvents = catchAsync(
    async (req: Request, res: Response) => {

        const result = await EventsService.getAllEvents()
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Events retrieved successfully",
            data: result
        })
    }
)

const getEventBySlug = catchAsync(
    async (req: Request, res: Response) => {
        const { slug } = req.params
        const result = await EventsService.getEventBySlug(slug as string)
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Event retrieved successfully",
            data: result
        })
    }
)

const updateEvent = catchAsync(
    async (req: Request, res: Response) => {
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.body.images = req.files.map(file => file.path)
        }
        const { slug } = req.params
        const result = await EventsService.updateEvent(req.body, slug as string, req.user)
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Event updated successfully",
            data: result
        })
    }
)

const deleteEvent = catchAsync(
    async (req: Request, res: Response) => {
        const { slug } = req.params
        const result = await EventsService.deleteEvent(slug as string, req.user)
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Event deleted successfully",
            data: result
        })
    }
)


export const EventsController = {
    createEvent,
    getAllEvents,
    getEventBySlug,
    updateEvent,
    deleteEvent
}
