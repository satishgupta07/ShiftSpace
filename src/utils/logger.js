import { createLogger, format, transports } from "winston";
const { combine, timestamp, json } = format;

const timestampFormat = timestamp({ format: "ddd, MMMM Do YYYY, h:mm:ss a" })

// Custom format for console logging with colors
const consoleLogFormat = format.combine(
    format.colorize(),
    timestampFormat,
    format.printf(({ level, message, timestamp }) => {
        return `${timestamp} - ${level}: ${message}`;
    })
);

// Create a Winston logger
const logger = createLogger({
    level: "info",
    format: combine(timestampFormat, json()),
    transports: [
        new transports.Console({
            format: consoleLogFormat,
        }),
        new transports.File({ filename: "app.log" }),
    ],
});

export default logger;
