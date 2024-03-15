package nl.d107.servlets.api;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;

@WebServlet(name = "GetOnlyBinRoomCalendarEventsServlet", value = "/api/get-only-bin-room-calendar-events/")
public class GetOnlyBinRoomCalendarEventsServlet extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // Read the contents of the JSON file into a string
        String onlyBinRoomCalendarEventsFile = getServletContext().getInitParameter("only-bin-room-calendar-events-file");
        String jsonFile = getServletContext().getRealPath(onlyBinRoomCalendarEventsFile);
        String jsonData = new String(Files.readAllBytes(Paths.get(jsonFile)));

        // Set the content type of the response to JSON
        response.setContentType("application/json;charset=UTF-8");

        // Write the JSON data to the response
        PrintWriter writer = response.getWriter();
        writer.write(jsonData);
        writer.flush();
    }
}
