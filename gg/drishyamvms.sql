-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 17, 2026 at 06:21 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `drishyamvms`
--

-- --------------------------------------------------------

--
-- Table structure for table `cameras`
--

CREATE TABLE `cameras` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `monitor_id` varchar(24) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(20) DEFAULT 'h264',
  `host` varchar(255) NOT NULL,
  `port` int(11) DEFAULT 554,
  `path` varchar(255) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `fps` int(11) DEFAULT 25,
  `status` enum('online','offline') DEFAULT 'offline',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `group_id` char(36) DEFAULT NULL,
  `channel` int(11) DEFAULT NULL,
  `s3_path` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cameras`
--

INSERT INTO `cameras` (`id`, `user_id`, `monitor_id`, `name`, `type`, `host`, `port`, `path`, `width`, `height`, `fps`, `status`, `created_at`, `updated_at`, `username`, `password`, `group_id`, `channel`, `s3_path`) VALUES
('00a53eb7-f59b-47ef-8145-373fa7f49b09', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '1a66d13ef1cb46dfa6815485', 'office 13 - Camera 02', 'h264', '103.61.254.67', 554, '/Streaming/Channels/201', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 2, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-02'),
('04280ae5-d715-4fd9-b929-994b83d3e424', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '8b7e936a0a75b04c2c8c005c', 'Camera 03', 'h264', '103.61.254.67', 554, '/Streaming/Channels/301', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('0589e652-a2d1-4a33-ac85-2922fe62d50e', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '85d762f98aeb4437bfbeb2ea', 'office 13 - Camera 07', 'h264', '103.61.254.67', 554, '/Streaming/Channels/701', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 7, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-07'),
('06ae57dd-4a8d-4e8e-acb9-c353ccf732f9', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'f8e6e462ff1b42229838c881', 'office 12 - Camera 13', 'h264', '111.125.141.20', 554, '/Streaming/Channels/1301', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 13, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-13'),
('073ca68f-a899-4d15-a2f5-4973b7255d31', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '2dbdeb89f4d14a2db0cdb33b', 'office 13 - Camera 06', 'h264', '103.61.254.67', 554, '/Streaming/Channels/601', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 6, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-06'),
('0b65ea5e-e36e-4846-a1b9-eb69372bd0e8', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '8b19ede2e3744ba4be9806ac', 'office 12 - Camera 01', 'h264', '111.125.141.20', 554, '/Streaming/Channels/101', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 1, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-01'),
('0dae649c-94cd-4554-8d55-eed4e8b1d9c0', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '91180a79aa7d43099c444204', 'office 13 - Camera 01', 'h264', '103.61.254.67', 554, '/Streaming/Channels/101', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 1, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-01'),
('10eddff3-aa43-47a8-abfb-2f8b1b3c2e12', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '410d8c2ea6e3e2bdc8dc9599', 'Camera 08', 'h264', '103.61.254.67', 554, '/Streaming/Channels/801', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('14920847-ea60-4653-b05a-a9e820c230a1', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '88f969c5786649beaac96d9c', 'basement', 'h264', '192.168.1.150', 554, '', 1280, 720, 30, 'online', '2026-02-14 17:40:58', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('1e91ca53-cb9a-4ce7-a7eb-dd42ee162b95', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'f7ab6a5b81088ea4d38017dc', 'Camera 06', 'h264', '103.61.254.67', 554, '/Streaming/Channels/601', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('227af16b-da77-488a-98ca-87593dbf1423', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '57599a3bdecc41f8bba47bac', 'office 12 - Camera 02', 'h264', '111.125.141.20', 554, '/Streaming/Channels/201', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 2, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-02'),
('22d72887-fad4-410f-a1c1-19a099f19f71', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'de123dcc26ce45a6893dfa6d', 'office 13 - Camera 08', 'h264', '103.61.254.67', 554, '/Streaming/Channels/801', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 8, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-08'),
('2912ee92-988d-48c6-b0d4-74ad9ae6b582', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'db772e99864641d7a6c0da0c', 'office 13 - Camera 04', 'h264', '103.61.254.67', 554, '/Streaming/Channels/401', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 4, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-04'),
('30260833-5feb-406c-b727-86b3604f7746', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'f18d86e321394ae6ad2a9aa1', 'drishyam', 'h264', '192.168.1.150', 554, '', 1920, 1080, 30, 'online', '2026-02-15 06:13:43', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('361ffa0f-83c0-40ab-97fb-9a03419a2086', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'bb87e820043027647f77f293', 'Camera 05', 'h264', '103.61.254.67', 554, '/Streaming/Channels/501', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('39631430-039d-460b-902d-c2758b142b31', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '6dea069724ec492ea671c39a', 'office', 'h264', '111.125.141.20', 554, '', 1920, 1080, 30, 'online', '2026-02-15 12:25:09', '2026-02-16 05:08:38', NULL, NULL, NULL, NULL, NULL),
('4a2220db-e908-4f0d-8173-ae10df8c44cc', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'f9ae11a00b6b48d0abff4001', 'office 12 - Camera 11', 'h264', '111.125.141.20', 554, '/Streaming/Channels/1101', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 11, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-11'),
('52201708-d0d9-4739-92b4-f88ab1ca4fad', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '2845534dfbb24105c5b81c79', 'TEST - Big Buck Bunny', 'h264', 'wowzaec2demo.streamlock.net', 554, '/vod/mp4:BigBuckBunny_115k.mp4', 240, 160, 24, 'online', '2026-02-15 06:27:39', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('56467bac-87db-4ad6-9c41-4916a961748e', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'aeadf15ce2b24dac88c90a16', 'office 12 - Camera 12', 'h264', '111.125.141.20', 554, '/Streaming/Channels/1201', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 12, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-12'),
('56ab8142-238d-4226-bdd4-5e966d3bd014', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '2dae73b9ee26464cae6a3739', 'office 12 - Camera 07', 'h264', '111.125.141.20', 554, '/Streaming/Channels/701', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 7, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-07'),
('68c9eead-7dff-4a30-99ff-cb49c856f539', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '2bfda585a00d414885dea0ee', 'Door camera', 'h264', '103.61.254.67', 554, '/Streaming/Channels/101', 1920, 1080, 30, 'online', '2026-02-15 08:27:57', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('6ee20686-5375-4aca-8683-5df911af8d34', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '773164020e1a4eb898fb5dc5', 'office 12 - Camera 10', 'h264', '111.125.141.20', 554, '/Streaming/Channels/1001', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 10, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-10'),
('7955476f-7544-44f3-ab68-745eaedd2e82', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '5f6464b60143f24f69d53bc1', 'Demo - Times Square Live', 'mjpeg', 'webcam.lu', 80, '/mjpg/video.mjpg?resolution=high', 640, 480, 15, 'online', '2026-02-15 06:50:22', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('893db119-a2b9-44e4-a81c-5931fd6c8d19', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '845ff5a9338844ef9d35080d', 'office 13 - Camera 05', 'h264', '103.61.254.67', 554, '/Streaming/Channels/501', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 5, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-05'),
('89b93644-a8f0-4bc0-b838-88fcb95f913e', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'ef61b88aacbe483580625065', 'office 12 - Camera 08', 'h264', '111.125.141.20', 554, '/Streaming/Channels/801', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 8, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-08'),
('8b0bafea-5781-4b9e-82ca-5666e52c1466', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'ad767920643b2d4b220b00d8', 'Camera 02', 'h264', '103.61.254.67', 554, '/Streaming/Channels/201', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('90d76ddc-2950-454b-8c61-c8dfa2bd521c', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'dc13c3d7cbd24d62b3528f49', 'office 12 - Camera 05', 'h264', '111.125.141.20', 554, '/Streaming/Channels/501', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 5, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-05'),
('97787caf-506a-4130-9707-27acfea249c9', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'b7735a7624d74922ad9228b8', 'office 12 - Camera 06', 'h264', '111.125.141.20', 554, '/Streaming/Channels/601', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:58:04', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 6, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-06'),
('a509c584-b256-4327-ab73-213611df6713', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '480f752de72a4381b88cd899', 'office 12 - Camera 03', 'h264', '111.125.141.20', 554, '/Streaming/Channels/301', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 3, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-03'),
('a618bd21-457c-49fe-9d51-0ff33a721f24', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '96109c1dd310945bf987cf42', 'Camera 04', 'h264', '103.61.254.67', 554, '/Streaming/Channels/401', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('ad0e0d37-136f-47b1-9418-745607fd67e7', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '71671fdeb1da48c58dd47567', 'office 12 - Camera 14', 'h264', '111.125.141.20', 554, '/Streaming/Channels/1401', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 14, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-14'),
('ae24ef3c-dee5-4c58-bd8a-43b17704fc4d', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '66321aea1468a0220d536968', 'Camera 01', 'h264', '103.61.254.67', 554, '/Streaming/Channels/101', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('b6b42021-18cf-47c8-8278-43904c268f11', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'testrtspformat', 'TEST - Standard Hikvision', 'h264', '103.61.254.67:8000', 8000, '/Streaming/Channels/101', 1920, 1080, 25, 'online', '2026-02-15 10:46:05', '2026-02-16 05:08:38', NULL, NULL, NULL, NULL, NULL),
('b7fd4d0a-36fa-4fc6-a925-e5b5c87322d4', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'a7c89910a15d48d8b7434d5a', 'office 12 - Camera 04', 'h264', '111.125.141.20', 554, '/Streaming/Channels/401', 1920, 1080, 25, 'online', '2026-02-16 05:55:59', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 4, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-04'),
('b9c4c615-740e-4ada-a78c-ce1008d2156a', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '293534d92371103c1b8be806', 'Demo - City Camera', 'mjpeg', '195.196.36.242', 80, '/mjpg/video.mjpg', 640, 480, 15, 'online', '2026-02-15 06:50:22', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL),
('c78d7ffe-b40e-49fe-8b67-bb8e3d89a069', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '59737aac8ecb4149962c639e', 'office 12 - Camera 09', 'h264', '111.125.141.20', 554, '/Streaming/Channels/901', 1920, 1080, 25, 'online', '2026-02-16 05:56:00', '2026-02-16 09:57:12', 'admin', 'Webin@123abc45', 'cfc263e1-b4cf-478e-891d-2510084228db', 9, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12/office-12---camera-09'),
('d8ffabb2-2f93-406a-ac03-8b74186a8b68', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'e8f802a2946e40efb192c82e', 'office 13 - Camera 03', 'h264', '103.61.254.67', 554, '/Streaming/Channels/301', 1920, 1080, 25, 'online', '2026-02-16 05:17:19', '2026-02-16 09:57:12', 'admin', 'Synoweb@abc123cd', '8ba219e6-6a66-4714-a431-9a924cce0d7d', 3, 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13/office-13---camera-03'),
('f81ec224-510d-4353-8b16-939d4a19603c', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', '83d10d95080d726d62d3984f', 'Camera 07', 'h264', '103.61.254.67', 554, '/Streaming/Channels/701', 1920, 1080, 25, 'online', '2026-02-15 06:33:27', '2026-02-16 05:08:38', 'admin', 'Synoweb@abc123cd', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `camera_groups`
--

CREATE TABLE `camera_groups` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int(11) DEFAULT 554,
  `http_port` int(11) DEFAULT 80,
  `username` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `device_type` enum('hikvision','dahua','axis','generic') DEFAULT 'hikvision',
  `total_channels` int(11) DEFAULT 0,
  `status` enum('online','offline','unknown') DEFAULT 'unknown',
  `location` varchar(255) DEFAULT NULL,
  `s3_folder` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `camera_groups`
--

INSERT INTO `camera_groups` (`id`, `user_id`, `name`, `host`, `port`, `http_port`, `username`, `password`, `device_type`, `total_channels`, `status`, `location`, `s3_folder`, `created_at`, `updated_at`) VALUES
('8ba219e6-6a66-4714-a431-9a924cce0d7d', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'office 13', '103.61.254.67', 554, 80, 'admin', 'Synoweb@abc123cd', 'hikvision', 8, 'online', '', 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-13', '2026-02-16 05:17:19', '2026-02-16 09:57:12'),
('cfc263e1-b4cf-478e-891d-2510084228db', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'office 12', '111.125.141.20', 554, 80, 'admin', 'Webin@123abc45', 'hikvision', 14, 'online', '', 'recordings/e231f9cf-6a0c-4f72-b55c-849039504dc3/office-12', '2026-02-16 05:55:59', '2026-02-16 09:57:12');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `subscription_id` char(36) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `gateway` enum('stripe','razorpay') NOT NULL,
  `gateway_payment_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `plans`
--

CREATE TABLE `plans` (
  `id` char(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  `max_cameras` int(11) NOT NULL,
  `max_storage` bigint(20) NOT NULL COMMENT 'Max storage in bytes',
  `price` decimal(10,2) NOT NULL,
  `billing_cycle` enum('monthly','yearly') NOT NULL,
  `stripe_product_id` varchar(255) DEFAULT NULL,
  `stripe_price_id` varchar(255) DEFAULT NULL,
  `razorpay_plan_id` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `plans`
--

INSERT INTO `plans` (`id`, `name`, `max_cameras`, `max_storage`, `price`, `billing_cycle`, `stripe_product_id`, `stripe_price_id`, `razorpay_plan_id`, `is_active`, `created_at`, `updated_at`) VALUES
('bbc95ea6-09c8-11f1-a26e-f854f659880d', 'Free', 2, 5368709120, 0.00, 'monthly', NULL, NULL, NULL, 1, '2026-02-14 22:45:17', '2026-02-14 22:45:17'),
('bbc96192-09c8-11f1-a26e-f854f659880d', 'Pro', 16, 107374182400, 999.00, 'monthly', NULL, NULL, NULL, 1, '2026-02-14 22:45:17', '2026-02-14 22:45:17'),
('bbc963a4-09c8-11f1-a26e-f854f659880d', 'Enterprise', 64, 1099511627776, 4999.00, 'monthly', NULL, NULL, NULL, 1, '2026-02-14 22:45:17', '2026-02-14 22:45:17');

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_revoked` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`id`, `user_id`, `token`, `expires_at`, `is_revoked`, `created_at`, `updated_at`) VALUES
('01ab819a-580d-4088-82fc-2ce05ec61eed', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE0NjYyNCwiZXhwIjoxNzcxNzUxNDI0fQ.vhkGKOwkO_lZZ4I4wAqU1WbOa2G8_wsk5Faj8xyBO2c', '2026-02-22 09:10:24', 0, '2026-02-15 09:10:24', '2026-02-15 09:10:24'),
('0ac1efda-4128-4e60-89dc-d7809ec78d3e', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE1NTc3MywiZXhwIjoxNzcxNzYwNTczfQ.UWuoGyDSbtdiZcgqvzaRWGhuPfPyp5_zcJ4lY2nevT4', '2026-02-22 11:42:53', 0, '2026-02-15 11:42:53', '2026-02-15 11:42:53'),
('0bc3f296-3040-4cdc-bdfa-a302f539b8b9', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTEzNDExOCwiZXhwIjoxNzcxNzM4OTE4fQ.l5m9fTwrfZgwJrDDd1BIXRs_AqwJMJtfv3pEul1-e-c', '2026-02-22 05:41:58', 0, '2026-02-15 05:41:58', '2026-02-15 05:41:58'),
('17bc0a83-7294-4671-923e-d3b5b1c11fb1', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE1NDQwMiwiZXhwIjoxNzcxNzU5MjAyfQ.VWS8cQG0Oz_z11ktHbpBz_8bIqypGO4JKuP8RytzqIo', '2026-02-22 11:20:02', 0, '2026-02-15 11:20:02', '2026-02-15 11:20:02'),
('1e7e50e0-a693-428d-a396-8cd98bc29ce6', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTA4OTUwNSwiZXhwIjoxNzcxNjk0MzA1fQ.Xldd6vfn8UDnT6_-wnYIFl2v9MwY3pbVya6sN5B_7qw', '2026-02-21 17:18:25', 0, '2026-02-14 17:18:25', '2026-02-14 17:18:25'),
('21873403-3cb2-4320-bde6-425c99378f5f', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTEzODI0NCwiZXhwIjoxNzcxNzQzMDQ0fQ.c3G436N5TDnTR1Qbi1UXXAx_pZ6dmXyv1HkgV2BO6is', '2026-02-22 06:50:44', 0, '2026-02-15 06:50:44', '2026-02-15 06:50:44'),
('2e78a55b-e981-4300-8d22-50584a65bfab', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTA5NjE1MSwiZXhwIjoxNzcxNzAwOTUxfQ.ld4r6TUUekZLIS4BfXTKH5Sufy1ykov7beEBjvg30ik', '2026-02-21 19:09:11', 0, '2026-02-14 19:09:11', '2026-02-14 19:09:11'),
('31988bbb-f064-4877-b281-ae6041072359', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE3MjYzNiwiZXhwIjoxNzcxNzc3NDM2fQ.3BtTIa7hUZpUtEH2DGNOHYqxJPbHqcJl6asVeQ3c9dk', '2026-02-22 16:23:56', 0, '2026-02-15 16:23:56', '2026-02-15 16:23:56'),
('36f27238-f1f3-4217-9ef0-9fd3fb9770aa', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE1ODI2MSwiZXhwIjoxNzcxNzYzMDYxfQ.1fwmg28NRqCafedXpD_zMwS1Bp-X9vsSdOiRdYjRSOs', '2026-02-22 12:24:21', 0, '2026-02-15 12:24:21', '2026-02-15 12:24:21'),
('398d07f0-2900-4927-9687-628e4a154f65', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIyMzY2MywiZXhwIjoxNzcxODI4NDYzfQ.AWKGh-bauoNvOztKYP55abE8pvUwNpmpfeG7abEXxZE', '2026-02-23 06:34:23', 0, '2026-02-16 06:34:23', '2026-02-16 06:34:23'),
('3bcf9084-c18a-47df-8a90-878954d2bb09', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIzNTczMiwiZXhwIjoxNzcxODQwNTMyfQ.w1b61BnEcEXx1pI08cCFX0bEe60N9sb7TlMYL90X2Mg', '2026-02-23 09:55:32', 0, '2026-02-16 09:55:32', '2026-02-16 09:55:32'),
('52312d21-7573-400b-953f-b6708876115e', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIyODQ0NCwiZXhwIjoxNzcxODMzMjQ0fQ.BR23yUpRpy5Z6Btz-ODEx9eqGXZVEk7YEEeu82iUmzM', '2026-02-23 07:54:04', 0, '2026-02-16 07:54:04', '2026-02-16 07:54:04'),
('54e84c1c-e05e-4b4b-b509-1dfbc8950e78', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIxNTg1MiwiZXhwIjoxNzcxODIwNjUyfQ.3Cg464964fb2ga5mbznp6ptxL8z7_q14vsYXIIcQo-Q', '2026-02-23 04:24:12', 0, '2026-02-16 04:24:12', '2026-02-16 04:24:12'),
('5c3c4157-538b-421e-be94-0e7093aca485', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIxNjAzNSwiZXhwIjoxNzcxODIwODM1fQ.akGY_nleC7L-94iIPxq6Y4PIxhlzbV9XNBQ5AVCjAdE', '2026-02-23 04:27:15', 0, '2026-02-16 04:27:15', '2026-02-16 04:27:15'),
('5f8549aa-f53d-435b-9485-b982165a009f', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTEzNzEzNywiZXhwIjoxNzcxNzQxOTM3fQ.gihjzE0sFuyVO5YPLgddY3HJUr6-jWd07i8v_3l_UXk', '2026-02-22 06:32:17', 0, '2026-02-15 06:32:17', '2026-02-15 06:32:17'),
('5fdcea7c-c808-4144-b5bc-20b9e688be02', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTI0NjM3NSwiZXhwIjoxNzcxODUxMTc1fQ.h0zah25cVRfKrJHykqFliiORzhR6nGK826nSmtI3Efs', '2026-02-23 12:52:55', 0, '2026-02-16 12:52:55', '2026-02-16 12:52:55'),
('6550effd-4db2-4fdd-a1fa-75bfce04ea49', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTMwNDUwNCwiZXhwIjoxNzcxOTA5MzA0fQ.4mu649b87wbdwsLs8GRTuQxZnoBuBDQVeUHcM9AgGlY', '2026-02-24 05:01:44', 0, '2026-02-17 05:01:44', '2026-02-17 05:01:44'),
('65cb6a9d-a465-4882-b726-ca62c7d2d03c', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIxODQ0NywiZXhwIjoxNzcxODIzMjQ3fQ.ijRQtYmKC2TQtRtU-w6qWKnYvTuBZglubPWPy7rCWQ0', '2026-02-23 05:07:27', 0, '2026-02-16 05:07:27', '2026-02-16 05:07:27'),
('695142f0-81a8-4081-b1e7-141f6063d7ce', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIyNzU0MSwiZXhwIjoxNzcxODMyMzQxfQ.C4JTyGnFTbt50f3-5vAeHVTAzxu7aJjHHzBIe67Cv08', '2026-02-23 07:39:01', 0, '2026-02-16 07:39:01', '2026-02-16 07:39:01'),
('6a298a0c-442b-4a04-83b2-a2e48cecfcac', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE0MTc5NywiZXhwIjoxNzcxNzQ2NTk3fQ.1AiVXP1HBL7SAx3jPZyd63lRSjGUVsZpjzU9hUM4b6I', '2026-02-22 07:49:57', 0, '2026-02-15 07:49:57', '2026-02-15 07:49:57'),
('70d3ff80-0de0-4180-9e01-92c8b4a5fa6c', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIzODk4MCwiZXhwIjoxNzcxODQzNzgwfQ.BT5jkAVtnM7SpZ9gi4bbzxoN5v7ySZnHMrTErx19fRQ', '2026-02-23 10:49:40', 0, '2026-02-16 10:49:40', '2026-02-16 10:49:40'),
('764d60a4-cccf-4a9f-a0e6-8b4e4318daf3', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIyNjMwNCwiZXhwIjoxNzcxODMxMTA0fQ.CEiXmmXPDKmIQP1H7h6r53s8APTcQN6p0xY3QoiSnX4', '2026-02-23 07:18:24', 0, '2026-02-16 07:18:24', '2026-02-16 07:18:24'),
('8495f1d6-0efe-489a-b88c-ee08776d41d2', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE0Mzg1NSwiZXhwIjoxNzcxNzQ4NjU1fQ.j4pPiM7eUnByPwSsqdZWPJeNc-I92ElIrMDlIXGwsJo', '2026-02-22 08:24:15', 0, '2026-02-15 08:24:15', '2026-02-15 08:24:15'),
('97ff57be-1d1a-422d-9bc3-138eb30ec048', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTI0NjM4MSwiZXhwIjoxNzcxODUxMTgxfQ._oW8mydlxuWKIL67S7WozmqzMrKkLIfunse5Kb5brW0', '2026-02-23 12:53:01', 0, '2026-02-16 12:53:01', '2026-02-16 12:53:01'),
('9a247e8a-42c8-48fa-922d-78842cca8dcc', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTA5NDU0MywiZXhwIjoxNzcxNjk5MzQzfQ.bkywPxkjUi9xaiLz89GUPKLEgsnrFDiL7Z2sho0qQvU', '2026-02-21 18:42:23', 0, '2026-02-14 18:42:23', '2026-02-14 18:42:23'),
('9cedbd6f-e6aa-495b-b68c-6f435ad3a98a', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTI2NTIzMiwiZXhwIjoxNzcxODcwMDMyfQ.S7PVeabb9k44apWRvzQUU8NM0m3E4JQZjOtCxy4fBxA', '2026-02-23 18:07:12', 0, '2026-02-16 18:07:12', '2026-02-16 18:07:12'),
('a8a0630d-1126-4197-b07e-af8ba2ca2154', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTEzNTkzMSwiZXhwIjoxNzcxNzQwNzMxfQ.khrfkykHhxLq2juD0YF-uVgUgAQFYeBuLmzRcEy_YS4', '2026-02-22 06:12:11', 0, '2026-02-15 06:12:11', '2026-02-15 06:12:11'),
('b65509e7-e5fd-411e-be3c-1b87ef208428', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE1MjM2NSwiZXhwIjoxNzcxNzU3MTY1fQ.fMgR-E0YAAMZeCTTkw3w122mHg6557zlyRZ7GDwJk7s', '2026-02-22 10:46:05', 0, '2026-02-15 10:46:05', '2026-02-15 10:46:05'),
('b7781418-cf08-40d2-9e09-b5dc310af47c', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE2Njk0MSwiZXhwIjoxNzcxNzcxNzQxfQ.ar735DebX92_p_C__PLvYoDXGRWmKrq3WILrU8vz5mU', '2026-02-22 14:49:01', 0, '2026-02-15 14:49:01', '2026-02-15 14:49:01'),
('b80e1c85-db98-49bf-9abb-c802c9b1a1d3', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIyMzgxNywiZXhwIjoxNzcxODI4NjE3fQ.lP2u-E2f1kq76edYsIG6NYn2wN0ertZUeoZkCGEOIUo', '2026-02-23 06:36:57', 0, '2026-02-16 06:36:57', '2026-02-16 06:36:57'),
('bd95787f-2b52-495b-89f3-6419bca3a646', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE0MTYyMSwiZXhwIjoxNzcxNzQ2NDIxfQ.A42c3A7SCXGwdux9BE_posbjAtWe4yoQEfS8IW_mlsI', '2026-02-22 07:47:01', 0, '2026-02-15 07:47:01', '2026-02-15 07:47:01'),
('cc1a27e2-52e7-4e78-9181-60a8d5ea7549', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTA5MjMzNywiZXhwIjoxNzcxNjk3MTM3fQ.TN5De4EOLdjpfkgVq--rLH2XTECgZpGvaRPoKWmwHqo', '2026-02-21 18:05:37', 0, '2026-02-14 18:05:37', '2026-02-14 18:05:37'),
('d24288b4-5a79-4c06-90e5-9611869ce6bb', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE3MTQ3MywiZXhwIjoxNzcxNzc2MjczfQ.qYvgLY6eJsHudXS7ihE6JpciR2C4ttMLWn9Oxk2uSrk', '2026-02-22 16:04:33', 0, '2026-02-15 16:04:33', '2026-02-15 16:04:33'),
('d7397620-84e8-41d9-8ce2-4a265c4d98e5', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTI0NzMwNiwiZXhwIjoxNzcxODUyMTA2fQ.m8eoloevTpCEQ79J688j1xyYwJDdbG9EGIY7Al_B4i8', '2026-02-23 13:08:26', 0, '2026-02-16 13:08:26', '2026-02-16 13:08:26'),
('e0fb72aa-a3a1-4950-a442-9958a88e2cf9', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE1MTIyOSwiZXhwIjoxNzcxNzU2MDI5fQ.LFaKVpe3Zi45DvOsDANfUOTvdKglLWltQ07e6IJZXmQ', '2026-02-22 10:27:09', 0, '2026-02-15 10:27:09', '2026-02-15 10:27:09'),
('e1dde73e-f115-4902-92b1-455187760e37', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTEzOTUwMCwiZXhwIjoxNzcxNzQ0MzAwfQ.CEWlqvqOVY67j79PQQ45_VDFxJfdUSD2uuZ7QXCxxE4', '2026-02-22 07:11:40', 0, '2026-02-15 07:11:40', '2026-02-15 07:11:40'),
('e23d9e76-c8fa-488a-875e-98f4668bd3b0', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE1MDgyNywiZXhwIjoxNzcxNzU1NjI3fQ.H39Ob33FObOkdn7L_R5nlNx2Rn7TpGlXvyJrgDCirbY', '2026-02-22 10:20:27', 0, '2026-02-15 10:20:27', '2026-02-15 10:20:27'),
('e3ce205b-3f3c-4ff6-94e1-332d111f71bc', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE0MDUwMywiZXhwIjoxNzcxNzQ1MzAzfQ.861hGuhhdNHv4dyJOqME0kjg_PtkuJuKqahyiaWb_mo', '2026-02-22 07:28:23', 0, '2026-02-15 07:28:23', '2026-02-15 07:28:23'),
('e9995fae-a542-48b8-be70-ce0b864887ba', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE2NDI0MSwiZXhwIjoxNzcxNzY5MDQxfQ.BAxu9lJ_476o61e8PXMqVznCzCrzqMYUpQSo21-SbBo', '2026-02-22 14:04:01', 0, '2026-02-15 14:04:01', '2026-02-15 14:04:01'),
('eac3bb2d-4da7-4332-997c-0f4acda54124', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIyMTExMSwiZXhwIjoxNzcxODI1OTExfQ.BwsR0eDHERCRZ45EWb1zk1X_r2S9Z6D5qPOnoQDGWyw', '2026-02-23 05:51:51', 0, '2026-02-16 05:51:51', '2026-02-16 05:51:51'),
('eb69b81a-8c35-4142-b6a3-cb94c5d31930', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIxNzIwMiwiZXhwIjoxNzcxODIyMDAyfQ.TqqdrjDhftKqVK453I_mCTvZUxXP5HqtdlX1MNpwrBc', '2026-02-23 04:46:42', 0, '2026-02-16 04:46:42', '2026-02-16 04:46:42'),
('ec7d06a1-16ba-4fe6-8652-8a50767fd6de', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTA5MDYyNiwiZXhwIjoxNzcxNjk1NDI2fQ.MWF0uGowiD0vC_CiOmp3_yhRi-3vSPPrRtYg_nD89d0', '2026-02-21 17:37:06', 0, '2026-02-14 17:37:06', '2026-02-14 17:37:06'),
('fc8b2534-9c51-4e68-af52-19ac95b43d17', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTA4OTQzOSwiZXhwIjoxNzcxNjk0MjM5fQ.9-RIPEo7wI_DxAvKufMAUD1uLOt2mEdOUG71SeIlJBo', '2026-02-21 17:17:19', 0, '2026-02-14 17:17:19', '2026-02-14 17:17:19'),
('fd8b7f6c-e902-4e92-a7ee-12afc86ec913', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTIzNzE1OSwiZXhwIjoxNzcxODQxOTU5fQ.GqtuDOCM1uRGF09hTKKTzFZfeKQmw8qaockXGKaqM3A', '2026-02-23 10:19:19', 0, '2026-02-16 10:19:19', '2026-02-16 10:19:19'),
('feb1f088-e4e2-49d1-8b5c-f35808f8d71f', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyMzFmOWNmLTZhMGMtNGY3Mi1iNTVjLTg0OTAzOTUwNGRjMyIsImlhdCI6MTc3MTE0NDk4MywiZXhwIjoxNzcxNzQ5NzgzfQ.vy_R_f39lbnMWx5ow7hphEZAy46xTtTixCrmuoA9CQg', '2026-02-22 08:43:03', 0, '2026-02-15 08:43:03', '2026-02-15 08:43:03');

-- --------------------------------------------------------

--
-- Table structure for table `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `sequelizemeta`
--

INSERT INTO `sequelizemeta` (`name`) VALUES
('001-create-users.js'),
('002-create-plans.js'),
('003-create-subscriptions.js'),
('004-create-payments.js'),
('005-create-cameras.js'),
('006-create-refresh-tokens.js'),
('007-create-camera-groups.js');

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `plan_id` char(36) NOT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `razorpay_subscription_id` varchar(255) DEFAULT NULL,
  `status` enum('active','trialing','past_due','cancelled','expired') DEFAULT 'active',
  `current_period_start` datetime NOT NULL,
  `current_period_end` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `user_id`, `plan_id`, `stripe_subscription_id`, `razorpay_subscription_id`, `status`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`) VALUES
('1187ae9f-09cc-11f1-a26e-f854f659880d', 'e231f9cf-6a0c-4f72-b55c-849039504dc3', 'bbc95ea6-09c8-11f1-a26e-f854f659880d', NULL, NULL, 'active', '2026-02-14 23:09:09', '2126-01-01 00:00:00', '2026-02-14 23:09:09', '2026-02-14 23:09:09');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `group_key` varchar(255) DEFAULT NULL,
  `api_key` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `email_verified` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `group_key`, `api_key`, `is_active`, `email_verified`, `created_at`, `updated_at`, `deleted_at`) VALUES
('e231f9cf-6a0c-4f72-b55c-849039504dc3', 'Test User', 'test@drishyam.com', '$2b$12$7Fb1NygcP86JBQoZYOqItOclAySejKLkB6W5yrPmZ4jXhc3qfX45O', 'user', '6b17427adfc70df0b5415ffd73a1e243', 'f07483f48995f5ada7e2033d6c7b34a4', 1, 0, '2026-02-14 17:17:19', '2026-02-15 00:15:40', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cameras`
--
ALTER TABLE `cameras`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_cameras_user_monitor` (`user_id`,`monitor_id`),
  ADD UNIQUE KEY `cameras_user_id_monitor_id` (`user_id`,`monitor_id`),
  ADD KEY `idx_cameras_user_id` (`user_id`),
  ADD KEY `cameras_group_id` (`group_id`);

--
-- Indexes for table `camera_groups`
--
ALTER TABLE `camera_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `camera_groups_user_id_host` (`user_id`,`host`),
  ADD KEY `camera_groups_user_id` (`user_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payments_user_id` (`user_id`),
  ADD KEY `idx_payments_gateway_payment_id` (`gateway_payment_id`),
  ADD KEY `idx_payments_status` (`status`),
  ADD KEY `payments_user_id` (`user_id`),
  ADD KEY `payments_gateway_payment_id` (`gateway_payment_id`),
  ADD KEY `subscription_id` (`subscription_id`);

--
-- Indexes for table `plans`
--
ALTER TABLE `plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_plans_name` (`name`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `name_2` (`name`),
  ADD UNIQUE KEY `name_3` (`name`),
  ADD UNIQUE KEY `name_4` (`name`),
  ADD UNIQUE KEY `name_5` (`name`),
  ADD UNIQUE KEY `name_6` (`name`),
  ADD UNIQUE KEY `name_7` (`name`),
  ADD UNIQUE KEY `name_8` (`name`),
  ADD UNIQUE KEY `name_9` (`name`),
  ADD UNIQUE KEY `name_10` (`name`),
  ADD UNIQUE KEY `name_11` (`name`),
  ADD UNIQUE KEY `name_12` (`name`),
  ADD UNIQUE KEY `name_13` (`name`),
  ADD UNIQUE KEY `name_14` (`name`),
  ADD UNIQUE KEY `name_15` (`name`),
  ADD UNIQUE KEY `name_16` (`name`),
  ADD UNIQUE KEY `name_17` (`name`),
  ADD UNIQUE KEY `name_18` (`name`),
  ADD UNIQUE KEY `name_19` (`name`),
  ADD UNIQUE KEY `name_20` (`name`),
  ADD UNIQUE KEY `name_21` (`name`),
  ADD UNIQUE KEY `name_22` (`name`),
  ADD UNIQUE KEY `name_23` (`name`),
  ADD UNIQUE KEY `name_24` (`name`),
  ADD UNIQUE KEY `name_25` (`name`),
  ADD UNIQUE KEY `name_26` (`name`),
  ADD UNIQUE KEY `name_27` (`name`),
  ADD UNIQUE KEY `name_28` (`name`),
  ADD UNIQUE KEY `name_29` (`name`),
  ADD UNIQUE KEY `name_30` (`name`),
  ADD UNIQUE KEY `name_31` (`name`),
  ADD UNIQUE KEY `name_32` (`name`),
  ADD UNIQUE KEY `name_33` (`name`),
  ADD UNIQUE KEY `name_34` (`name`),
  ADD UNIQUE KEY `name_35` (`name`),
  ADD UNIQUE KEY `name_36` (`name`),
  ADD UNIQUE KEY `name_37` (`name`),
  ADD UNIQUE KEY `name_38` (`name`),
  ADD UNIQUE KEY `name_39` (`name`),
  ADD UNIQUE KEY `name_40` (`name`),
  ADD UNIQUE KEY `name_41` (`name`),
  ADD UNIQUE KEY `name_42` (`name`),
  ADD UNIQUE KEY `name_43` (`name`),
  ADD UNIQUE KEY `name_44` (`name`),
  ADD UNIQUE KEY `name_45` (`name`),
  ADD UNIQUE KEY `name_46` (`name`),
  ADD UNIQUE KEY `name_47` (`name`),
  ADD UNIQUE KEY `name_48` (`name`),
  ADD UNIQUE KEY `name_49` (`name`),
  ADD UNIQUE KEY `name_50` (`name`),
  ADD UNIQUE KEY `name_51` (`name`),
  ADD UNIQUE KEY `name_52` (`name`),
  ADD UNIQUE KEY `name_53` (`name`),
  ADD UNIQUE KEY `name_54` (`name`),
  ADD UNIQUE KEY `name_55` (`name`),
  ADD UNIQUE KEY `name_56` (`name`),
  ADD UNIQUE KEY `name_57` (`name`),
  ADD UNIQUE KEY `name_58` (`name`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_refresh_tokens_token` (`token`),
  ADD UNIQUE KEY `token` (`token`),
  ADD UNIQUE KEY `token_2` (`token`),
  ADD UNIQUE KEY `token_3` (`token`),
  ADD UNIQUE KEY `token_4` (`token`),
  ADD UNIQUE KEY `token_5` (`token`),
  ADD UNIQUE KEY `token_6` (`token`),
  ADD UNIQUE KEY `token_7` (`token`),
  ADD UNIQUE KEY `token_8` (`token`),
  ADD UNIQUE KEY `token_9` (`token`),
  ADD UNIQUE KEY `token_10` (`token`),
  ADD UNIQUE KEY `token_11` (`token`),
  ADD UNIQUE KEY `token_12` (`token`),
  ADD UNIQUE KEY `token_13` (`token`),
  ADD UNIQUE KEY `token_14` (`token`),
  ADD UNIQUE KEY `token_15` (`token`),
  ADD UNIQUE KEY `token_16` (`token`),
  ADD UNIQUE KEY `token_17` (`token`),
  ADD UNIQUE KEY `token_18` (`token`),
  ADD UNIQUE KEY `token_19` (`token`),
  ADD UNIQUE KEY `token_20` (`token`),
  ADD UNIQUE KEY `token_21` (`token`),
  ADD UNIQUE KEY `token_22` (`token`),
  ADD UNIQUE KEY `token_23` (`token`),
  ADD UNIQUE KEY `token_24` (`token`),
  ADD UNIQUE KEY `token_25` (`token`),
  ADD UNIQUE KEY `token_26` (`token`),
  ADD UNIQUE KEY `token_27` (`token`),
  ADD UNIQUE KEY `token_28` (`token`),
  ADD UNIQUE KEY `token_29` (`token`),
  ADD UNIQUE KEY `token_30` (`token`),
  ADD UNIQUE KEY `token_31` (`token`),
  ADD UNIQUE KEY `token_32` (`token`),
  ADD UNIQUE KEY `token_33` (`token`),
  ADD UNIQUE KEY `token_34` (`token`),
  ADD UNIQUE KEY `token_35` (`token`),
  ADD UNIQUE KEY `token_36` (`token`),
  ADD UNIQUE KEY `token_37` (`token`),
  ADD UNIQUE KEY `token_38` (`token`),
  ADD UNIQUE KEY `token_39` (`token`),
  ADD UNIQUE KEY `token_40` (`token`),
  ADD UNIQUE KEY `token_41` (`token`),
  ADD KEY `idx_refresh_tokens_user_id` (`user_id`),
  ADD KEY `idx_refresh_tokens_expires` (`expires_at`),
  ADD KEY `refresh_tokens_token` (`token`),
  ADD KEY `refresh_tokens_user_id` (`user_id`);

--
-- Indexes for table `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscriptions_user_id` (`user_id`),
  ADD KEY `idx_subscriptions_status` (`status`),
  ADD KEY `idx_subscriptions_plan_id` (`plan_id`),
  ADD KEY `subscriptions_user_id` (`user_id`),
  ADD KEY `subscriptions_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_users_email` (`email`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD UNIQUE KEY `email_8` (`email`),
  ADD UNIQUE KEY `email_9` (`email`),
  ADD UNIQUE KEY `email_10` (`email`),
  ADD UNIQUE KEY `email_11` (`email`),
  ADD UNIQUE KEY `email_12` (`email`),
  ADD UNIQUE KEY `email_13` (`email`),
  ADD UNIQUE KEY `email_14` (`email`),
  ADD UNIQUE KEY `email_15` (`email`),
  ADD UNIQUE KEY `email_16` (`email`),
  ADD UNIQUE KEY `email_17` (`email`),
  ADD UNIQUE KEY `email_18` (`email`),
  ADD UNIQUE KEY `email_19` (`email`),
  ADD UNIQUE KEY `email_20` (`email`),
  ADD UNIQUE KEY `email_21` (`email`),
  ADD UNIQUE KEY `email_22` (`email`),
  ADD UNIQUE KEY `email_23` (`email`),
  ADD UNIQUE KEY `email_24` (`email`),
  ADD UNIQUE KEY `email_25` (`email`),
  ADD UNIQUE KEY `email_26` (`email`),
  ADD UNIQUE KEY `email_27` (`email`),
  ADD UNIQUE KEY `email_28` (`email`),
  ADD UNIQUE KEY `email_29` (`email`),
  ADD UNIQUE KEY `email_30` (`email`),
  ADD UNIQUE KEY `email_31` (`email`),
  ADD UNIQUE KEY `email_32` (`email`),
  ADD UNIQUE KEY `email_33` (`email`),
  ADD UNIQUE KEY `users_email` (`email`),
  ADD UNIQUE KEY `email_34` (`email`),
  ADD UNIQUE KEY `email_35` (`email`),
  ADD UNIQUE KEY `email_36` (`email`),
  ADD UNIQUE KEY `email_37` (`email`),
  ADD UNIQUE KEY `email_38` (`email`),
  ADD UNIQUE KEY `email_39` (`email`),
  ADD UNIQUE KEY `email_40` (`email`),
  ADD UNIQUE KEY `email_41` (`email`),
  ADD UNIQUE KEY `email_42` (`email`),
  ADD UNIQUE KEY `email_43` (`email`),
  ADD UNIQUE KEY `email_44` (`email`),
  ADD UNIQUE KEY `email_45` (`email`),
  ADD UNIQUE KEY `email_46` (`email`),
  ADD UNIQUE KEY `email_47` (`email`),
  ADD UNIQUE KEY `email_48` (`email`),
  ADD UNIQUE KEY `email_49` (`email`),
  ADD UNIQUE KEY `email_50` (`email`),
  ADD UNIQUE KEY `email_51` (`email`),
  ADD UNIQUE KEY `email_52` (`email`),
  ADD UNIQUE KEY `email_53` (`email`),
  ADD UNIQUE KEY `email_54` (`email`),
  ADD UNIQUE KEY `email_55` (`email`),
  ADD UNIQUE KEY `email_56` (`email`),
  ADD UNIQUE KEY `email_57` (`email`),
  ADD UNIQUE KEY `email_58` (`email`),
  ADD UNIQUE KEY `email_59` (`email`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_is_active` (`is_active`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cameras`
--
ALTER TABLE `cameras`
  ADD CONSTRAINT `cameras_ibfk_39` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `cameras_ibfk_40` FOREIGN KEY (`group_id`) REFERENCES `camera_groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `camera_groups`
--
ALTER TABLE `camera_groups`
  ADD CONSTRAINT `camera_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_110` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payments_ibfk_111` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_ibfk_111` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `subscriptions_ibfk_112` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
