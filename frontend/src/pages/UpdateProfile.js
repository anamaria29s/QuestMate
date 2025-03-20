import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 
import './Profile.css';
import './UpdateProfile.css';

const UpdateProfile = () => {
    const username = localStorage.getItem('username');
    const [formData, setFormData] = useState({
        bio: "",
        birth_date: "",
        profile_picture: null, 
    });

    const [imagePreview, setImagePreview] = useState(""); 
    const navigate = useNavigate(); 

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/profile/${username}/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(response => {
            setFormData({
                bio: response.data.bio,
                birth_date: response.data.birth_date,
                profile_picture: response.data.profile_picture || null, 
            });

            if (response.data.profile_picture) {
                setImagePreview(response.data.profile_picture);
            }
        })
        .catch(error => console.error("Error fetching profile data", error));
    }, [username]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageChange = (e) => {
        

        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, profile_picture: file });
            console.log("File being sent:", file);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const updatedData = new FormData();
        updatedData.append("bio", formData.bio);
        updatedData.append("birth_date", formData.birth_date);

        if (formData.profile_picture) {
            updatedData.append("profile_picture", formData.profile_picture); 
        }

        const debugData = {};
    updatedData.forEach((value, key) => {
        debugData[key] = value;
    });

    console.log("Data being sent:", debugData);

        axios.put(`http://127.0.0.1:8000/api/profile/${username}/update/`, updatedData, {
            headers: { 
                "Authorization": `Bearer ${localStorage.getItem("access")}`,
                "Content-Type": "multipart/form-data", 
            }
        })
        .then(response => {
            console.log("Profile updated:", response.data);
            navigate(`/profile/${username}/`);
        })
        .catch(error => console.error("Error updating profile", error));
    };

    const handleCancel = () => {
        navigate(`/profile/${username}/`);
    };

    return (
        <div className="edit-profile">
            <h2>Edit Profile</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Bio:
                    <textarea name="bio" value={formData.bio} onChange={handleChange}></textarea>
                </label>
                <label>
                    Birth Date:
                    <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
                </label>
                <label>
                    Profile Picture:
                    <input type="file" name="profile_picture" accept="image/*" onChange={handleImageChange} />
                    {imagePreview && <img src={imagePreview} alt="Profile Preview" className="image-preview" />}
                </label>
                <button type="submit">Save Changes</button>
                <button type="button" onClick={handleCancel}>Cancel</button>
            </form>
        </div>
    );
};

export default UpdateProfile;
