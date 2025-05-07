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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate(); 

    useEffect(() => {
        // Fetch user profile data
        setIsLoading(true);
        axios.get(`http://127.0.0.1:8000/api/profile/${username}/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
        })
        .then(response => {
            setFormData({
                bio: response.data.bio || "",
                birth_date: response.data.birth_date || "",
                profile_picture: response.data.profile_picture || null, 
            });

            if (response.data.profile_picture) {
                setImagePreview(response.data.profile_picture);
            }
            setIsLoading(false);
        })
        .catch(error => {
            console.error("Error fetching profile data", error);
            setError("Failed to load profile data. Please try again.");
            setIsLoading(false);
        });
    }, [username]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.match('image.*')) {
                setError("Please select an image file");
                return;
            }
            
            setFormData({ ...formData, profile_picture: file });
            
            // Create image preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setError(""); // Clear any previous errors
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const updatedData = new FormData();
        updatedData.append("bio", formData.bio);
        updatedData.append("birth_date", formData.birth_date);

        if (formData.profile_picture && formData.profile_picture instanceof File) {
            updatedData.append("profile_picture", formData.profile_picture); 
        }

        axios.put(`http://127.0.0.1:8000/api/profile/${username}/update/`, updatedData, {
            headers: { 
                "Authorization": `Bearer ${localStorage.getItem("access")}`,
                "Content-Type": "multipart/form-data", 
            }
        })
        .then(response => {
            console.log("Profile updated successfully");
            setIsLoading(false);
            navigate(`/profile/${username}/`);
        })
        .catch(error => {
            console.error("Error updating profile", error);
            setError("Failed to update profile. Please try again.");
            setIsLoading(false);
        });
    };

    const handleCancel = () => {
        navigate(`/profile/${username}/`);
    };

    if (isLoading && !imagePreview) {
        return <div className="edit-profile"><p>Loading your profile...</p></div>;
    }

    return (
        <div className="edit-profile">
            <h2>Edit Your Profile</h2>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="bio">Bio</label>
                    <textarea 
                        id="bio"
                        name="bio" 
                        value={formData.bio} 
                        onChange={handleChange}
                        placeholder="Write something about yourself..."
                    ></textarea>
                </div>
                
                <div className="form-group">
                    <label htmlFor="birth_date">Birth Date</label>
                    <input 
                        type="date" 
                        id="birth_date"
                        name="birth_date" 
                        value={formData.birth_date} 
                        onChange={handleChange} 
                    />
                </div>
                
                <div className="form-group">
                    <label>Profile Picture</label>
                    <div className="file-input-container">
                        <label htmlFor="profile_picture" className="file-input-label">
                            Choose New Image
                        </label>
                        <input 
                            type="file"
                            id="profile_picture" 
                            name="profile_picture" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            className="file-input"
                        />
                    </div>
                    
                    {imagePreview && (
                        <div className="image-preview-container">
                            <img 
                                src={imagePreview} 
                                alt="Profile Preview" 
                                className="image-preview" 
                            />
                        </div>
                    )}
                </div>
                
                <div className="buttons-container">
                    <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UpdateProfile;